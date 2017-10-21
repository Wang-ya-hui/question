//github改了
// 加载 模块
var express = require("express"); // 服务器模块
var bodyParser = require("body-parser"); // 处理解析post请求数据模块
var multer = require("multer"); // 处理 formdata 格式提交数据模块
var fs = require("fs"); // 处理文件写入/读出模块
var cookieParser = require("cookie-parser"); // 解析 cookie 模块
var template = require("art-template"); // 模板引擎

// 创建服务器对象
var app = express();

// 指定跟目录文件夹
app.use(express.static("www"));

// 解析请求数据
app.use(bodyParser.urlencoded({extended: true}));

// 解析 cookie 数据
app.use(cookieParser());

// 设置模板引擎类型
app.engine(".html",template.__express);

// 设置视图引擎
app.set("view engine","html");

// 关闭模板引擎的缓存
template.config("cache",false);

// 给模板添加辅助函数(过滤器)
// template.helper(name, callback)
// 调用：{{question.time（实参一） | millisecond}}
// 传递多个参数：{{question.time（实参一） | millisecond : 实参二 , 实参三}}
template.helper("millisecond",function(time){
	return new Date(time).getTime();
});
template.helper("formatTime",function(time){
	time = new Date(time);
	var y = time.getFullYear();
	var M = time.getMonth() + 1;
	var d = time.getDate();
	var h = time.getHours();
	var m = time.getMinutes();
	var s = time.getSeconds();
	M = M < 10 ? "0"+M : M;
	d = d < 10 ? "0"+d : d;
	h = h < 10 ? "0"+h : h;
	m = m < 10 ? "0"+m : m;
	s = s < 10 ? "0"+s : s;
	return y+"-"+M+"-"+d+" "+h+":"+m+":"+s;
});
template.helper("formatIp",function(ip){
	var regExp = /::1/ig;
	if (ip.match(regExp)) {
		return "127.0.0.1";
	} else{
		return ip.substr(7);
	}
});

// 配置上传头像存储
var storage = multer.diskStorage({
	destination: "www/uploads",
	// cb：请求处理管线
	filename: function(req,res,cb){
		var username = req.cookies.username;
		cb(null,username + ".jpg");
	}
});
var upload = multer({storage});


// 判断是否登录的请求处理管线
function checkLogin(req,res,next){
	// 通过 cookie 中的 username 判断用户有没有登录
	// (既然进入提问页面提问，不是已经说明登录了吗？1.在提问页面把cookie移出了呢
	// 2.我们 cookie 存储一个月，在临界点点击提问，刚好进入提问页面，但是cookie被清除)
	var username = req.cookies.username;
	if (username) {
		next();
	}else{
		// req.xhr 是一个布尔值。
		// true：表示发送的请求是 XHR
		// false：表示是一个表单请求或者是一个普通的网页请求
		// console.log(req.xhr);
		if (req.xhr) {
			// 代表用户发送的是 xhr 请求，即表示用户要自行处理数据
			res.status(200).json({code:0,msg:"登录异常，请重新登录"});
		} else{
			// 代表是一个表单请求，意味着用户不能处理数据，意味着我们帮前端处理
			// res.redirect("/login-page?param1=参数");
			res.redirect("/login-page");
		}
	}
}

/************************注册************************/
// 获取注册页面请求接口
app.get("/register-page",function(req,res){
	res.render("register",{title: "注册"});
});
// 发送注册请求接口
app.post("/user/register",function(req,res){
	// 先判断用户是否已经被注册过
	var filePath = "users/"+ req.body.username + ".json";
	fs.exists(filePath,function(exi){
		if (exi) {
			// 用户存在
			res.status(200).json({code:2,msg:"用户名已存在，请重新填写"});
		} else{
			// 用户不存在，直接把注册等信息写到本地
			// 在 body 里面添加 注册时间和ip
			req.body.ip = req.ip;
			req.body.time = new Date();
			fs.writeFile(filePath,JSON.stringify(req.body),function(err){
				if (err) {
					res.status(200).json({code:0,msg:"系统写入文件失败，请稍后再试"});
				} else{
					res.status(200).json({code:1,msg:"注册成功"});
				}
			});
		}
	});
});


/************************登录************************/
// 获取登录页面请求接口
app.get("/login-page",function(req,res){
	res.render("login",{title: "登录"});
});
// 发送登录请求接口
app.post("/user/login",function(req,res){
	// 判断用户是否存在
	var filePath = "users/" + req.body.username + ".json";
	fs.exists(filePath,function(exi){
		if (exi) {
			// 用户存在，接着判断密码是否正确(读取本地文件)
			fs.readFile(filePath,function(err,data){
				if (err) {
					// 读取文件失败
					res.status(200).json({code:2,msg:"系统错误，读取文件失败"});
				} else{
					// 注意 data 是一个字符串
					var user = JSON.parse(data);
					if (req.body.password == user.password) {
						// 把用户名存到响应报文的 cookie(1.把用户名以 cookie 的形式保存在前端，可以
						// 作为是否登录的一个凭证；2.发送网络请求的时候，会把 cookie 带到后台)
						// param1：键    param2：值   param3：过期时间 对象 Object{expires}
						var time = new Date();
						time.setMonth(time.getMonth() + 1);
						res.cookie("username",req.body.username,{expires:time});
						res.status(200).json({code:1,msg:"登录成功"});
					} else{
						res.status(200).json({code:3,msg:"密码错误"});
					}
				}
			});
		} else{
			// 用户名不存在
			res.status(200).json({code:0,msg:"用户名不存在"});
		}
	});
});


/************************提问************************/
// 获取提问页面请求接口
app.get("/ask-page",function(req,res){
	res.render("ask",{title: "提问"});
});
// 发送提问请求接口
app.post("/question/ask",checkLogin,function(req,res){
	// 写入提问的问题
	// 生成问题文件的文件名
	var time = new Date();
	var filePath = "questions/" + time.getTime() + ".json";
	// 组合完善存储数据
	req.body.content = req.body.content.replace(/</g,"&lt;");
	req.body.content = req.body.content.replace(/>/g,"&gt;");
	req.body.ip = req.ip;
	req.body.time = time;
	req.body.username = req.cookies.username;
	// 写入文件
	fs.writeFile(filePath,JSON.stringify(req.body),function(err){
		if (!err) {
			// 页面重定向
			res.status(200).redirect("/");
		} else{
			res.status(200).json({code:2,msg:"系统错误，写入文件失败"});
		}
	});
});


/************************首页************************/
// 获取首页页面请求接口
app.get("/",function(req,res){
	// 返回所有问题（包含答案）
	// 获取一个文件夹中所有的字文件
	fs.readdir("questions",function(err,files){
		if (err) {
			// 读取失败
			res.status(200).json({code:0,msg:"系统错误，读取文件失败"});
		}else{
			// 读取所有的字文件成功
			// 数组逆序，目的：让最新的问题在上面
			files = files.reverse();
			// 创建一个数组，存放所有的问题对象
			var allquestions = [];
			
			// 方法一：用 for 循环来遍历所有文件
			/*
			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				// 拼接读取文件的文件路径
				var filePath = "questions/" + file;
				// 读取文件
				// readFile() 异步    readFileSync()
				// 使用异步的话有可能前端拿不到数据：因为还没读取完毕你就已经响应
				var data = fs.readFileSync(filePath);
				var obj = JSON.parse(data);
				allquestions.push(obj);
			}
			// 响应 
			res.status(200).json(allquestions);
			*/
			
			// 方法二：使用递归来遍历，用异步读取数据
			var i = 0;
			function readQuestion(){
				if (i < files.length) {
					var file = files[i];
					// 拼接读取文件的文件路径
					var filePath = "questions/" + file;
					fs.readFile(filePath,function(err,data){
						if (!err) {
							var obj = JSON.parse(data);
							allquestions.push(obj);
							// 改变 i 的值，继续读取
							i ++;
							readQuestion();
						}
					});
				}else{
					// 响应 
					res.status(200).render("index",{
						title: "首页",
						username: req.cookies.username,
						data: allquestions
					});
				}
			}
			readQuestion();
		}
	});
});


/************************退出登录************************/
app.get("/user/logout",function(req,res){
	// 清除 cookie 中的 username(access_token、timestamp)
	res.clearCookie("username");
	res.status(200).redirect("/");
});


/************************上传头像************************/
// 获取上传页面请求接口
app.get("/upload-page",function(req,res){
	res.status(200).render("upload",{title: "个人资料"});
});
// 发送上传请求接口
// upload.array("photo",1) == upload.single("photo")
app.post("/user/upload",upload.single("photo"),function(req,res){
	// res.status(200).json({code:1,msg:"上传头像成功"});
	// res.status(200).send('<script>alert("上传头像成功");location.href="/";</script>');
	res.status(200).redirect("/");
});


/************************回答问题************************/
// 获取回答页面请求接口
app.get("/answer-page",function(req,res){
	res.status(200).render("answer",{title: "回答"});
});
// 发送答案请求接口
app.post("/question/answer",checkLogin,function(req,res){
	// 先根据 req.cookies.question 读取对应的文件
	var filePath = "questions/" + req.cookies.question + ".json";
	fs.readFile(filePath,function(err,data){
		if (!err) {
			var dataObj = JSON.parse(data);
			// 判断这个问题之前是否有过答案
			if (!dataObj.answers) {
				dataObj.answers = [];
			}
			// 把 answer 也封装成一个小对象
			// {content,time,ip,username}
			// req.body.content = req.body.content.replace(/</g,"&lt;");
			// req.body.content = req.body.content.replace(/>/g,"&gt;");
			req.body.time = new Date();
			req.body.ip = req.ip;
			req.body.username = req.cookies.username;
			
			// 把这个小回答的对象放到 answers 数组中
			dataObj.answers.push(req.body);
			
			// 修改过之后，重新写入文件
			fs.writeFile(filePath,JSON.stringify(dataObj),function(err){
				if (!err) {
					res.status(200).redirect("/");
				}else{
					res.status(200).json({code:2,msg:"系统错误，写入文件失败"});
				}
			});
		}
	});
	
});

app.listen(3000,function(){
	console.log("问答项目服务器已启动……");
});







