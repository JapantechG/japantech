// BatLingo Ranked V2 - Stage 2: prototype matchmaking only.
// This module deliberately does NOT create a game or update Elo.
import { auth, db } from './firebase.js';
import { ref, runTransaction, onValue, onDisconnect, remove } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';
import { RANK_RULES, RANK_SEASON } from './rank-config.js';

const WAIT_TTL_MS = 120_000;
const ACCEPT_TIMEOUT_MS = 5000;
let session = null;
let generation = 0;

function emit(type, extra = {}) {
  window.dispatchEvent(new CustomEvent('batlingo-rank-matchmaking', { detail: { type, ...extra } }));
}

function groupKey(config) {
  const parts = [RANK_SEASON, config.studyMode || 'jlpt', config.target || 'n1', config.category || 'vocabulary', config.subMode || 'kanji_meaning'];
  return parts.map(v => String(v).toLowerCase().replace(/[^a-z0-9_-]/g, '_')).join('_');
}

function matchId() {
  return `rm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

async function release(current, { deleteWaiting = true, deleteMatched = false } = {}) {
  current.unsubscribe?.();
  current.unsubscribe = null;
  // Cancel the pending onDisconnect operation before leaving the queue.
  try { await current.disconnect?.cancel(); } catch (e) { console.warn('[RANK] onDisconnect cancel:', e); }
  if (deleteWaiting || deleteMatched) {
    // Only remove our own ticket with the same session token.
    await runTransaction(current.groupRef, value => {
      if (!value || value[current.uid]?.token !== current.token) return;
      const ticket = value[current.uid];

if (!ticket || ticket.token !== current.token) {
    return;
}

if (ticket.status === 'waiting') {
    delete value[current.uid];
    return value;
}

if (deleteMatched && ticket.status === 'matched') {
    delete value[current.uid];
    return value;
}

return;
      delete value[current.uid];
      return value;
    }, { applyLocally: false });
  }
}

export async function cancelRankSearch() {
    if (!session) return;
    await declineRankMatch();
}

export async function findRankMatch(config, rating = 1000) 
{
  if (!auth.currentUser) throw new Error('LOGIN_REQUIRED');
  if (session) throw new Error('SEARCH_ALREADY_ACTIVE');
  const uid = auth.currentUser.uid;
  const key = groupKey(config);
  const groupRef = ref(db, `rankedQueues/${key}`);
  const token = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const current = { uid, key, groupRef, token, unsubscribe: null, disconnect: null };
  const thisGeneration = ++generation;
  session = current;
  const elo = Number.isFinite(Number(rating)) ? Math.max(0, Math.round(Number(rating))) : 1000;
  const now = Date.now();
  const myTicket = { uid, elo, token, status: 'waiting', joinedAt: now };

  console.log('[RANK] Start matchmaking:', {uid,group: key,elo,token});

  try {
    // A single transaction claims both tickets atomically, avoiding double pairing.
    const result = await runTransaction(groupRef, old => {
      const queue = old && typeof old === 'object' ? { ...old } : {};

      console.log('[RANK] Queue before transaction:', queue);

      for (const [id, ticket] of Object.entries(queue)) {
        if (!ticket || (ticket.status === 'waiting' && now - Number(ticket.joinedAt || 0) > WAIT_TTL_MS)) delete queue[id];
      }
 const existingTicket = queue[uid];

if (existingTicket?.status === 'matched') {

    console.warn(
        '[RANK] Previous matched ticket:',
        existingTicket
    );

    // Ticket thuộc phiên tìm trận cũ:
    // cho phép tạo phiên tìm trận mới.
    if (existingTicket.token !== token) {
        delete queue[uid];
    } else {
        return;
    }
}
      const candidates = Object.values(queue)
        .filter(t => t?.status === 'waiting' && t.uid !== uid && Math.abs(Number(t.elo) - elo) <= RANK_RULES.initialSearchRange)
        .sort((a, b) => a.joinedAt - b.joinedAt);
      const opponent = candidates[0];
   
      if (opponent) {
          const id = matchId();
          const deadline = Date.now() + ACCEPT_TIMEOUT_MS;

          queue[opponent.uid] = {
              ...opponent,
              status: 'matched',
              matchId: id,
              opponentUid: uid,
              role: 'host',
              accepted: false,
              acceptDeadline: deadline
          };

          queue[uid] = {
              ...myTicket,
              status: 'matched',
              matchId: id,
              opponentUid: opponent.uid,
              role: 'guest',
              accepted: false,
              acceptDeadline: deadline
          };
      } else {
          queue[uid] = myTicket;
      }

      return queue;
    }, { applyLocally: false });

    console.log("[RANK] Transaction result:", {
    committed: result.committed,
    snapshot: result.snapshot.val()
});

    if (!result.committed) throw new Error('QUEUE_TRANSACTION_ABORTED');

    if (session !== current || thisGeneration !== generation) {
      await release(current);
      return;
    }

    // onDisconnect removes ONLY this player's ticket. This is a demo cleanup,
    // not a full disconnect/forfeit policy for real Ranked games.
    current.disconnect = onDisconnect(ref(db, `rankedQueues/${key}/${uid}`));
    await current.disconnect.remove();
    if (session !== current) { await release(current); return; }

    
    current.unsubscribe = onValue(current.groupRef, snap => {
        if (session !== current) return;

        const queue = snap.val() || {};
        const ticket = queue[uid];

        if (!ticket || ticket.token !== token) {
            session = null;
            current.unsubscribe?.();
            emit('expired');
            return;
        }

        if (ticket.status === 'cancelled') {
            session = null;
            current.unsubscribe?.();
            emit('cancelled');
            return;
        }

        if (ticket.status === 'matched') {
            const opponent = queue[ticket.opponentUid];

            if (
                !opponent ||
                opponent.matchId !== ticket.matchId ||
                opponent.status === 'cancelled'
            ) {
                declineRankMatch().catch(console.error);
                return;
            }

            if (!current.acceptNotified) {
                current.acceptNotified = true;

                emit('accept_required', {
                    matchId: ticket.matchId,
                    role: ticket.role,
                    opponentUid: ticket.opponentUid,
                    deadline: ticket.acceptDeadline
                });
            }

            emit('accept_state', {
                myAccepted: !!ticket.accepted,
                opponentAccepted: !!opponent.accepted
            });

            return;
        }

        if (ticket.status === 'ready') {
            const opponent = queue[ticket.opponentUid];

            if (
                opponent?.status !== 'ready' ||
                opponent.matchId !== ticket.matchId
            ) return;

            session = null;
            current.unsubscribe?.();

            // Không xóa ticket tại đây.
            // Stage 3 sẽ chuyển sang bản ghi rankedMatches.
            current.disconnect?.cancel().catch(console.error);

            emit('ready', {
                matchId: ticket.matchId,
                role: ticket.role,
                opponentUid: ticket.opponentUid,
                group: key
            });
        }
    }, error => {
        if (session !== current) return;

        session = null;
        emit('error', { message: error.message });
    });


    if (session === current) emit('searching', { group: key });
  } catch (error) {
    if (session === current) session = null;
    await release(current).catch(console.error);
    emit('error', { message: error.message });
    throw error;
  }
}


export async function acceptRankMatch() {
    const current = session;
    if (!current) return;

    const result = await runTransaction(current.groupRef, queue => {
        if (!queue) return;

        const me = queue[current.uid];
        const opponent = queue[me?.opponentUid];

        if (
            me?.token !== current.token ||
            me.status !== 'matched' ||
            !opponent ||
            opponent.matchId !== me.matchId ||
            Date.now() >= me.acceptDeadline
        ) return;

        me.accepted = true;

        if (opponent.accepted) {
            me.status = 'ready';
            opponent.status = 'ready';
        }

        return queue;
    }, { applyLocally: false });

    if (!result.committed) {
        throw new Error('MATCH_ACCEPT_EXPIRED');
    }
}

export async function declineRankMatch() {
    const current = session;
    if (!current) return;

    generation++;
    session = null;

    try {
        await runTransaction(current.groupRef, queue => {
            if (!queue) return;

            const me = queue[current.uid];

            if (
                !me ||
                me.token !== current.token ||
                !['waiting', 'matched'].includes(me.status)
            ) return;

            const opponent = queue[me.opponentUid];

            if (
                opponent &&
                opponent.matchId === me.matchId
            ) {
                opponent.status = 'cancelled';
            }

            me.status = 'cancelled';
            return queue;
        }, { applyLocally: false });
    } finally {
        current.unsubscribe?.();
        try {
            await current.disconnect?.cancel();
        } catch (error) {
            console.warn('[RANK] Disconnect cleanup:', error);
        }

        emit('cancelled');
    }
}


export function isRankSearching() { return session !== null; }
