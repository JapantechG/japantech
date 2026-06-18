import {

db,
collection,
addDoc

}

from "./firebase.js";

document.getElementById("saveBtn")
.addEventListener(

"click",

async ()=>{

let text =
document.getElementById("txt").value;

await addDoc(

collection(db,"notes"),

{

note:text,

date:new Date()

}

);

alert("Saved");

}

);