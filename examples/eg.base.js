const {jigsaw}=require("jigsaw.js")("127.0.0.1","127.0.0.1");
const sleep=(t)=>new Promise((r)=>setTimeout(r,t));

let jg=new jigsaw();


const domainserver = JigsawNet("127.0.0.1","127.0.0.1").domainserver;

domainserver();

let endpoint=new WSEndpoint({
	entry:"127.0.0.1",
	domserver:"127.0.0.1",
});

endpoint.on("enter",(jgname)=>{
	console.log(jgname,"enter")
})
endpoint.on("leave",(jgname)=>{
	console.log(jgname,"leave")
})

endpoint.on("error",console.error);



(async()=>{
	while(true){
		try{
			await jg.send("abc:get",{
				abc:123
			});

		}catch(err){

		}
		console.log("send");
		await sleep(1000);
	}

})();
