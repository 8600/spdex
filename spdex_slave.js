const http = require('http');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const request = require('request');
const fs = require('fs');
const qs = require('querystring');
const nodemailer = require('nodemailer');
const express = require('express');
const socket = require('socket.io');

// 大单交易量
let bigdeal;

// 比赛开始id
let slaveStart = null;
// 比赛结束id
let slaveEnd = null;

// 推送开关(默认开)
let push_zhuo = true;
let push_dong = true;
let push_xin = true;
// id列表
let eventIdList = {};
// 登录页
let $loginPage;
// 比赛列表页
let $matchListPage;
//
let cookie;
//
let cookieVerifycode;
//
let cookieLogin;
// 
let failed = 0;
// 
let slavedata;
// 
let getdatacount = 0;
// 
const MAIL_ZHUO = {
    user: '306988049', 
    pass: 'bhzvnkrsfznzbidb'
}
const MAIL_XIN = {
    user: '3024303013', 
    pass: 'inqfflvauoykdgch'
}
const MAIL_DONG = {
    user: '986937723', 
    pass: 'aldeeltehzspbcfd'
}
// web服务
const app = express();
const server = http.createServer(app);
// socket服务
const io = socket(server);

// 读取日志
function loadLog(data) {
    return new Promise(function(reslove, reject) {
        const date = new Date();
        const datestr = (date.getMonth()+1) + '-' + date.getDate();
        const path = './logs/' + datestr + '.txt';
        if (fs.existsSync(path)) {
            fs.readFile(path, 'utf8', function (err, data) {
                // 判断 如果有错 打印错误
                if (err) {
                    console.log('读取错误!')
                }
                // 否则 打印读取到的数据
                // console.log(data);
    
                reslove(data);
            });
        } else {
            reslove('');
        }
    });
}

// 保存日志
function saveLog(data) {
    return new Promise(function(reslove, reject) {
        const date = new Date();
        const datestr = (date.getMonth()+1) + '-' + date.getDate();
        const path = './logs/' + datestr + '.txt';
        fs.writeFile(path, data, function(err){
            // 如果有错 抛出错误
            if (err) {
                throw err;
            }
            console.log('写入成功!')

            reslove(data);
        });
    });
}

// 登录链
function loginFunc() {
    getLoginPage().then(getVerifyCode).then(recongizeCode).then(startLogin);
}

// 获取登录页
function getLoginPage() {
    return new Promise(function(resolve,reject){
        const options = {
            hostname: 'c.spdex.com',
            port: 80,
            path: '/Login.aspx',
            agent: false,  // 仅为此一个请求创建一个新代理。
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Host': 'c.spdex.com',
                'Pragma': 'no-cache',
                'Referer': 'https://c.spdex.com/Login.aspx',
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36'
            }
        };
        const request = http.request(options, (response) => {
            let data = [];
            response.on('data', (chunk) => {
                data.push(chunk);
            });
            response.on('end', () => {
                // const body = iconv.decode(Buffer.concat(data), 'gbk');
                const body = Buffer.concat(data).toString('utf-8');
                $loginPage = cheerio.load(body);
                cookie = response.headers['set-cookie'][0].split(' ')[0];
                console.log('获取登录页cookie: ' + cookie);
                resolve();
            });
        });
        request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            console.log(e.stack);
        });
        request.end();
    });
}


// 获取登录验证码
function getVerifyCode() {
    return new Promise(function(resolve, reject){
        const options = {
            hostname: 'c.spdex.com',
            port: 80,
            path: '/ValidateCodePage.aspx',
            agent: false,  // 仅为此一个请求创建一个新代理。
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Cookie': cookie,
                'Host': 'c.spdex.com',
                'Pragma': 'no-cache',
                'Referer': 'https://c.spdex.com/ValidateCodePage.aspx',
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36'
            }
        };
        const request = http.request(options, (response) => {
            let data = [];
            response.on('data', (chunk) => {
                data.push(chunk);
            });
            response.on('end', () => {
                const base64 = Buffer.concat(data).toString('base64');
                console.log('获取登录验证码base64: ' + base64);
                cookieVerifycode = response.headers['set-cookie'][0].split(' ')[0];
                // console.log(response.headers['set-cookie'][0].split(' ')[0]);
                resolve(base64);
            });
        });
        request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            console.log(e.stack);
        });
        request.end();
    });
}

// 打码
function recongizeCode(base64) {
	const formData = {
		'user': 'tomxtomx',
		'pass': '1986121tom',
		'softid':'906705',  //软件ID 可在用户中心生成
		'codetype': '1902',  //验证码类型 http://www.chaojiying.com/price.html 选择
		'file_base64': base64
	};
	return new Promise(function(resolve,reject){
		request({
		    url: 'http://upload.chaojiying.net/Upload/Processing.php',
		    method: 'POST',
		    headers: {
		        'content-type': 'application/x-www-form-urlencoded',
		    },
		    body: JSON.stringify(formData)
		}, function(error, response, body) {
		    if (!error && response.statusCode == 200) {
		    	resolve(JSON.parse(body)['pic_str'])
		        // console.log(body) // 请求成功的处理逻辑
		    }
		});
	});
}

// 模拟登录
function startLogin(verifycode) {
    return new Promise(function(resolve, reject){
        const data = {
            __EVENTTARGET: '',
            __EVENTARGUMENT: '',
            __VIEWSTATE: $loginPage('#__VIEWSTATE').val(),
            __VIEWSTATEGENERATOR: $loginPage('#__VIEWSTATEGENERATOR').val(),
            ctl00$ContentPlaceHolder1$TxtUserName: 'tomx088',
            ctl00$ContentPlaceHolder1$TxtPassWord: '1986121tom',
            ctl00$ContentPlaceHolder1$TxtValida: verifycode,
            ctl00$ContentPlaceHolder1$BtnSubmit: '登 陆'
        }
        const content = qs.stringify(data);

        console.log('模拟登录: ' + content);

        const options = {
            hostname: 'c.spdex.com',
            port: 80,
            path: '/Login.aspx',
            agent: false,  // 仅为此一个请求创建一个新代理。
            method: 'POST',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Cookie': cookie+' '+cookieVerifycode,
                'Host': 'c.spdex.com',
                'Pragma': 'no-cache',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://c.spdex.com/Login.aspx',
                'Upgrade-Insecure-Requests': 1,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36'
            }
        };
        const request = http.request(options, (response) => {
            let data = [];
            response.on('data', (chunk) => {
                data.push(chunk);
            });
            response.on('end', () => {
                // 登录成功
                if (response.headers['set-cookie']) {
                    cookieLogin = response.headers['set-cookie'][0].split(' ')[0];
                    cookieLogin += ' ';
                    cookieLogin += response.headers['set-cookie'][1].split(' ')[0];
                    console.log('模拟登录cookie: '+cookieLogin);
                    console.log('登录成功');
                    // 获取id列表页参数
                    // getEventIdListParams();
                    getDetail(slaveStart, slaveEnd);
                    //
                    failed = 0;
                // 登录失败
                } else {
                    console.log('登录失败');
                    // 
                    failed++;
                    if (failed>=20)  {
                        console.log('Spdex登录异常，请通知技术查看');
                        sendMail('Spdex登录异常，请通知技术查看', MAIL_ZHUO); // 邮件通知
                        sendMail('Spdex登录异常，请通知技术查看', MAIL_DONG); // 邮件通知
                        sendMail('Spdex登录异常，请通知技术查看', MAIL_XIN); // 邮件通知
                    } else {
                        setTimeout(function(){
                            // 尝试重新登录
                            loginFunc();
                        }, 5000);
                    }
                }
            });
        });
        request.on('error', (e) => {
            console.error(`problem with request: ${e.message}`);
            console.log(e.stack);
        });
        request.write(content);
        request.end();
    });
}

// 查具体数据
function getDetail(slaveStart, slaveEnd) {
    console.log('当前爬详情页：'+slaveStart);
    // 
    const currkey = Object.keys(eventIdList)[slaveStart];
    const currval = eventIdList[currkey];
    // console.log(currkey);
    const options = {
        hostname: 'c.spdex.com',
        port: 80,
        path: '/biginfo.aspx?eventId='+currkey,
        agent: false,  // 仅为此一个请求创建一个新代理。
        method: 'GET',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Cookie': cookie+' '+cookieVerifycode+' '+cookieLogin,
            'Host': 'c.spdex.com',
            'Pragma': 'no-cache',
            'Upgrade-Insecure-Requests': 1,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.89 Safari/537.36'
        }
    };
    const request = http.request(options, (response) => {
        let data = [];
        response.on('data', (chunk) => {
            data.push(chunk);
        });
        response.on('end', () => {
            const body = Buffer.concat(data).toString('utf-8');
            $ = cheerio.load(body);
            // 正常处理
            $('.biginfo').map(function(i, biginfo){
                if(i===1 || i===2 || i===3) {
                    $(biginfo).find('tr').map(function(ii, tr){
                        const jiaoyiliang = $(tr).children('td').eq(2).children('span').text().replace(/,/g, '') || '-';
                        const time = $(tr).children('td').eq(4).text() || '-';
                        const timered = $(tr).children('td').eq(4).attr('style')==='color:red';
                        const type = $(tr).children('td').eq(0).text() || '-';
                        const attr = $(tr).children('td').eq(1).text() || '-';
                        const mode = jiaoyiliang>=bigdeal ? '大单' : (timered && jiaoyiliang>5000) ? '红字' : '';
                        const d = '<p>' + mode + ' | ' +  currval.title + ' | ' + currval.matchtime + ' | ' + type + ' | ' + attr + ' | ' +  '<span style="color:red;font-weight:bold;">'+jiaoyiliang+'</span>' + ' | ' + time + '</p>';
                        // 成交量大于3w 或者 交易时间红字及成交量大于5000
                        if (jiaoyiliang>=bigdeal || (timered && jiaoyiliang>5000)) {
                            // 检查是否新纪录
                            if (checkData(currval.data, d)) {
                                currval.data.push(d); // 添加到集合
                                slavedata += d; // 添加到邮件推送
                            }
                        }
                    });
                }
            });

            // 已爬完
            if (slaveStart===slaveEnd) {
                console.log('爬完详情页');
                // 通知master
                callMaster();
            // 尚未爬完
            } else {
                // console.log(eventIdList);
                slaveStart--;
                setTimeout(function(){
                    getDetail(slaveStart, slaveEnd)
                }, 0);
            }
            
        });
    });
    request.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
        console.log(e.stack);
    });
    request.end();
}

// 校验数据
function checkData(data, d) {
    let pass = true
    data.map((o) => {
        if (o===d) pass = false
    });
    return pass;
}

// 发邮件 
function sendMail(str, { user, pass }) {
    const host = 'smtp.qq.com';
    const port = 465;
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: true,
        auth: { user, pass }
    });
    var mailOptions = {
        // 发送邮件的地址
        from: '"这里是发件人名字" <'+user+'@qq.com>', // login user must equal to this user
        // 接收邮件的地址
        to: user+"@qq.com", // xrj0830@gmail.com
        // 邮件主题
        subject: "你有一条新消息",
        // 以HTML的格式显示，这样可以显示图片、链接、字体颜色等信息
        html: `<div>${str}</div>`
    };
    transporter.sendMail(mailOptions, (error, info = {}) => {
        if (error) {
            console.log('');
            console.log(error);
            return;
        }
    });
}

// 通知主机结果
function callMaster() {
    request({
        // url: 'http://127.0.0.1:3000/mission',
        url: 'http://120.26.64.198:3000/mission',
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ slavedata, eventIdList }) 
    });
}

// 发短信
function sendMsg() {
    
}

// 网页服务
function webService() {
    app.use(express.json({limit:'50mb'})) // for parsing application/json
    app.use(express.urlencoded({ limit:'50mb', extended: true })) // for parsing application/x-www-form-urlencoded
    app.post('/mission', (req, res) => {
        
        // console.log('slaveStart:', req.body.slaveStart);
        // console.log('slaveEnd:', req.body.slaveEnd);
        // console.log('eventIdList:', req.body.eventIdList);
        slaveStart = Number(req.body.slaveStart);
        slaveEnd = Number(req.body.slaveEnd);
        bigdeal = Number(req.body.bigdeal);
        eventIdList = req.body.eventIdList;
        slavedata = '';
        
        // 爬取次数超过300次重新登录
        getdatacount++;
        if (getdatacount>300) {
            getdatacount = 0;
            loginFunc();
        } else {
            cookieLogin ? getDetail(slaveStart, slaveEnd) : loginFunc()
        }

        res.send('ok');
    });
    app.use(express.static('public'));
    // socket服务
    io.on('connection', (socket) => {
        console.log('socket已连接');
    });
    // 开启服务
    // server.listen(2000, () => { console.log('服务启动'); });
    server.listen(3000, () => { console.log('服务启动'); });
}

webService();

// slaveStart = 5;
// slaveEnd = 0;
// loginFunc();

