## jigsaw-endpoint-websocket 文档

### 1.1 Jigsaw网络 & 接入点
    
Jigsaw网络指的是由互相可以访问的Jigsaw实例共同组成的一个作用区域。   
这个网络需要有一个接入点 (endpoint)，接入点可以是HTTP、WebSocket等方式的实现。    
本项目就是一个WebSocket接入点的一个实现。   
   
----------
   
### 1.2 安装
  
在npm项目下执行命令```npm install jigsaw-endpoint-websocket --save```   
    
   
### 1.3 实例   
   
#### 1.3.1 监听接口信息接收实例   
   
wsserver.js   
```
const option={entry:"127.0.0.1",domserver:"127.0.0.1"}; //该参数确定了Jigsaw节点的网络范围

const {jigsaw}=require("jigsaw.js")(option.entry,option.domserver);
const WSEndpoint=require("jigsaw-endpoint-websocket");

const endpoint = new WSEndpoint(option);

```
   
sender.js   
```
const option={entry:"127.0.0.1",domserver:"127.0.0.1"};
const {jigsaw}=require("jigsaw.js")(option.entry,option.domserver);

let jg = new jigsaw();
jg.on("ready",()=>{

	setInterval(()=>{
		jg.send("myjigsaw:data",{hello:"Hello World!"});
	},2000);
})

```
   
browser.js   
```

const ws=new WebSocket("ws://127.0.0.1:1001/myjigsaw");
ws.send(JSON.stringify({type:"setport",portname:"data"}));

ws.onmessage=(raw)=>{
	let msg = JSON.parse(raw);

	if(msg.type == "port"){
		console.log(`在接口${msg.port}收到信息`,msg.msg);
	}else if(msg.type == "system"){
		console.log("系统回复",msg);
	}
}
```
   
#### 1.3.2 向Jigsaw节点发送信息实例
   
wsserver.js   
```
const option={entry:"127.0.0.1",domserver:"127.0.0.1"}; //该参数确定了Jigsaw节点的网络范围

const {jigsaw}=require("jigsaw.js")(option.entry,option.domserver);
const WSEndpoint=require("jigsaw-endpoint-websocket");

const endpoint = new WSEndpoint(option);

```
   
recver.js   
```
const option={entry:"127.0.0.1",domserver:"127.0.0.1"};
const {jigsaw}=require("jigsaw.js")(option.entry,option.domserver);


let jg=new jigsaw("myjigsaw");

jg.port("data",({hello})=>{

	console.log(hello);

	return {hellotoo:"yes,you are jigsaw"};
});

```
   
browser.js   
```
const ws=new WebSocket("ws://127.0.0.1:1001/iamsender");
ws.send(JSON.stringify({type:"send",reqid:"",path:"myjigsaw:data",data:{
		hello:"i am jigsaw"
	}}));
```
    
### 1.4 APIs
    
#### 1.4.1 WSEndpoint.prototype.constructor({ entry , domserver , port})
    
此为WSEndpoint的构造器，用于创建一个 WSEndpoint实例。   
   
entry 代表 ```jigsaw网络的入口网络地址``` ，与导入jigsaw.js时填入的第一个参数一致。   
domserver 代表 ```jigsaw网络的域名服务器地址```，与导入jigsaw.js时填入的第二个参数一致。   
port 代表 WebSocket服务器 要监听的端口，默认是 1001   
       
所有WSEndpoint都继承了EventEmitter,于是你可以通过 ws.on("event",callback) 来监听事件.   

#### 1.4.2 事件 enter

若一个WebSocket客户端成功创建了一个jigsaw实例，那么会触发本事件，事件的第一个参数是jigsaw的名字。

#### 1.4.3 事件 leave

若一个WebSocket客户端销毁了一个jigsaw实例，那么会触发本事件，事件的第一个参数是jigsaw的名字。

#### 1.4.4 事件 error

若发生了错误，则该事件会被触发。

#### 1.4.5 基于WebSocket的Endpoint通信协议

##### 1.4.2.1 创建WebSocket客户端与WSEndpoint的连接

```
new WebSocket("ws://127.0.0.1:1001/jigsawname");
```
参照这个实例来创建连接，其中127.0.0.1:1001代表WSEndpoint的网络地址，    
jigsawname代表要创建的jigsaw实例名。

##### 1.4.2.2 封包格式
   
在WebSocket中与WSEndpoint进行的任何数据通信都采用JSON字符串格式，其中封包格式如下   
```
{
	type:"setport",//代表封包类型
	portname:"test" //其他项都是封包的参数
}
```
   
各种类型的封包以及用途如下   
   
请求封包: （WebSocket客户端向Endpoint通信）   
```
setport(portname): 监听一个接口名为portname的数据，之后只要有jigsaw实例向该接口发送数据，都会被WebSocket客户端收到。

getallports() : 获取当前WebSocket客户端已经监听的所有jigsaw接口。

send(path,data,reqid) : 向一个path路径对应的jigsaw接口发送数据，data为要发送的数据，reqid应该随机指定一个，这样接受到接口的回复之后可以准确取回。
```
   
回复封包： （Endpoint回复WebSocket客户端）   
   
```
system(ok,err,data): 
这是一个系统操作的回复，例如执行监听一个接口的操作之后收到的回复。
若ok为false，则一定会有一个错误发生，err会报告错误的原因。
若ok为true，则data值会报告回复的具体信息。

```
