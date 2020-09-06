const option = {entry:"127.0.0.1",domserver:"127.0.0.1"};
const {jigsaw,domainserver} = require("jigsaw.js")(option.entry,option.domserver);
const util = require("util");
const sleep = util.promisify(setTimeout);

const WSEndpoint = require("../lib/lib");


let endpoint=new WSEndpoint(option);

endpoint.on("enter",(jgname)=>{
	console.log(jgname,"enter")
})
endpoint.on("leave",(jgname)=>{
	console.log(jgname,"leave")
})
endpoint.on("error",console.error);

function startSending(){
	let jg=new jigsaw();
	let count=0;

	jg.on("ready",async ()=>{
		while(true){
			try{
				await jg.send("hw:get",{
					hello:"Hello World!",
					count:count++
				});
				console.log("sended");
			}catch(err){
				console.log(err);
			}
			await sleep(100);
		}
	})
	
}

domainserver();
startSending();

console.log("持续向 hw:get 发送欢迎信息中");
