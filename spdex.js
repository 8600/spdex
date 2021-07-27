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
let bigdeal = 50000;

// 推送开关(默认开)
let push_zhuo = true;
let push_dong = true;
let push_xin = true;
let push_zhuo_big = true;
let push_dong_big = true;
let push_xin_big = true;
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
let masterdata;
// 
let slavedata;
// 
let maildata=[];
// 
let getdatacount = 0;
// 
const MAIL_XIN = {
    user: '3024303013', 
    pass: 'oslahrzhhjizddec'
}
const MAIL_ZHUO = {
    user: '306988049', 
    pass: 'bhzvnkrsfznzbidb'
}
const MAIL_ZHUO2 = {
    user: '13785039', 
    pass: 'lqwwfoqdbalvbhag'
}
const MAIL_DONG = {
    user: '986937723', 
    pass: 'aldeeltehzspbcfd'
}
const MAIL_DONG2 = {
    user: '164678149', 
    pass: 'tjuvoldqgqgkbhaf'
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
            ctl00$ContentPlaceHolder1$TxtUserName: 'eddie88',
            ctl00$ContentPlaceHolder1$TxtPassWord: '830824',
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
                    getEventIdListParams();
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


// 获取id列表页参数
function getEventIdListParams() {
    const options = {
        hostname: 'c.spdex.com',
        port: 80,
        path: '/MtList',
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
            'Referer': 'http://c.spdex.com/dv_1_0_0_0_0_0',
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
            console.log(body)
            $matchListPage = cheerio.load(body);
            const __VIEWSTATE = $matchListPage('#__VIEWSTATE').val();
            const __VIEWSTATEGENERATOR = $matchListPage('#__VIEWSTATEGENERATOR').val();
            const pages = $matchListPage('#ContentPlaceHolder1_ContentPlaceHolder1_AspNetPager1').find('option').length;
            console.log('获取id列表页参数__VIEWSTATE: '+__VIEWSTATE);
            console.log('获取id列表页参数__VIEWSTATEGENERATOR: '+__VIEWSTATEGENERATOR);
            console.log('获取id列表页总页码: '+pages);
            // 异常处理
            if (__VIEWSTATE==undefined || __VIEWSTATEGENERATOR==undefined) {
                failed++;
                if (failed>=20)  {
                    console.log('Spdex爬取列表参数异常，请通知技术查看');
                    sendMail('Spdex爬取列表参数异常，请通知技术查看', MAIL_ZHUO); // 邮件通知
                    sendMail('Spdex爬取列表参数异常，请通知技术查看', MAIL_DONG); // 邮件通知
                    sendMail('Spdex爬取列表参数异常，请通知技术查看', MAIL_XIN); // 邮件通知
                } else {
                    setTimeout(function(){
                        // 尝试重新爬取
                        getEventIdListParams();
                    }, 5000);
                } 
            // 正常处理
            } else {
                failed = 0;
                getEventIdList(__VIEWSTATE, __VIEWSTATEGENERATOR, pages);
            }
        });
    });
    request.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
        console.log(e.stack);
    });
    request.end();
}


// 获取id列表页
function getEventIdList(__VIEWSTATE, __VIEWSTATEGENERATOR, pages) {
    const data = {
        '__VIEWSTATE': __VIEWSTATE,
        '__VIEWSTATEGENERATOR': __VIEWSTATEGENERATOR,
        '__EVENTTARGET': 'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$AspNetPager1',
        '__EVENTARGUMENT': '',
        'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DropMatchPath': 1,
        'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DropLotteryId': 0,
        'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$DropJcId': 0,
        'ctl00$ctl00$ContentPlaceHolder1$ContentPlaceHolder1$AspNetPager1_input': pages,
        'qnd': 0
    }
    const content = qs.stringify(data);

    console.log('获取id列表页: ' + content);

    const options = {
        hostname: 'c.spdex.com',
        port: 80,
        path: '/MtList',
        agent: false,  // 仅为此一个请求创建一个新代理。
        method: 'POST',
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Language': 'zh-CN,zh;q=0.9,zh-TW;q=0.8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Cookie': cookie+' '+cookieVerifycode+' '+cookieLogin,
            'Host': 'c.spdex.com',
            'Pragma': 'no-cache',
            'Referer': 'http://c.spdex.com/dv_1_0_0_0_0_0',
            'Content-Type': 'application/x-www-form-urlencoded',
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
            $('.dataviewer').map((i, o) => { 
                const id = $(o).attr('id');
                const title = $(o).prev().children('h3').text();
                const matchtime = $(o).prev().children('.matchtime').text().replace('开赛时间：', '');
                const mt = new Date(matchtime).getTime();
                const nt = new Date().getTime();
                // 比赛已存在
                if (eventIdList[id]) {
                    // 比赛已过期
                    if (nt>mt) {
                        delete eventIdList[id];
                    }
                // 新比赛
                } else {
                    // 比赛未过期
                    if (nt<mt) {
                        eventIdList[id] = { title, matchtime, data:[] };
                    }
                }
            });
            
            // 已爬完
            if (pages===1) {
                // console.log(eventIdList);
                masterdata = '';
                slavedata = '';
                maildata = [];
                console.log('列表页爬完');
                console.log('所有比赛长度：'+Object.keys(eventIdList).length);
                const totalMatch = Object.keys(eventIdList).length; // 所有比赛长度
                const masterStart = Math.ceil(totalMatch/2-1);
                const masterEnd = 0;
                const slaveStart = Math.ceil(totalMatch-1);
                const slaveEnd = Math.ceil(totalMatch/2);
                getDetail(masterStart, masterEnd); // 主机从中间开始
                getDetailSlave(slaveStart, slaveEnd, eventIdList); // 从机从后面开始
            // 尚未爬完
            } else {
                // console.log(eventIdList);
                pages--;
                console.log('准备爬列表页：'+pages);
                setTimeout(function(){
                    getEventIdList(__VIEWSTATE, __VIEWSTATEGENERATOR, pages);
                }, 0);
            }
        });
    });
    request.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
        console.log(e.stack);
    });
    request.write(content);
    request.end();
}

// 查具体数据
function getDetail(masterStart, masterEnd) {
    console.log('当前爬详情页：'+masterStart);
    const currkey = Object.keys(eventIdList)[masterStart];
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
                                masterdata += d; // 添加到邮件推送
                            }
                        }
                    });
                }
            });

            // 已爬完
            if (masterStart===masterEnd) {
                console.log('爬完详情页');
                maildata.push(masterdata);
                finished();
            // 尚未爬完
            } else {
                // console.log(eventIdList);
                masterStart--;
                setTimeout(function(){
                    getDetail(masterStart, masterEnd)
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

// 从机任务
function getDetailSlave(slaveStart, slaveEnd, eventIdList) {
    request({
        // url: 'http://127.0.0.1:2000/mission',
        url: 'http://118.31.246.165:3000/mission',
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({ slaveStart, slaveEnd, eventIdList, bigdeal })
    });
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

// 完成推送 
function finished() {
    if (maildata.length===2) {
        // console.log('masterdata:', masterdata);
        // console.log();
        // console.log('slavedata:', slavedata);
        if (masterdata!=='' || slavedata!=='') {
            // 加上推送时间
            const bigreg = /<p[^>]*>大单(?:(?!<\/p>)[\s\S])*<\/p>/gi;
            const date = new Date().toString();
            const mailstr = date + '<br>' + maildata[0] + maildata[1];
            const mailbig = mailstr.match(bigreg);
            const mailstr_big = date + '<br>' + mailbig;

            console.log(mailstr)

            // 开启推送
            console.log('push_zhuo:', push_zhuo);
            console.log('push_zhuo_big:', push_zhuo_big);
            if (push_zhuo) sendMail(mailstr, MAIL_ZHUO);
            if (push_zhuo_big && mailbig!==null) sendMail(mailstr_big, MAIL_ZHUO2);

            // 开启推送
            console.log('push_dong:', push_dong);
            console.log('push_dong_big:', push_dong_big);
            if (push_dong) sendMail(mailstr, MAIL_DONG);
            if (push_xin_big && mailbig!==null) sendMail(mailstr_big, MAIL_DONG2);

            // 开启推送
            console.log('push_xin:', push_xin);
            console.log('push_xin_big:', push_xin_big);
            if (push_xin) sendMail(mailstr, MAIL_XIN);
            if (push_xin_big && mailbig!==null) sendMail(mailstr_big, MAIL_XIN);

            // socket推送
            io.sockets.emit('events', mailstr);
            
            // 保存日志
            loadLog().then(function(data){
                let newData = '\n' + (new Date().toString() + '\n') + mailstr + data;
                saveLog(newData);
            });
        }
        
        // 5秒后重新爬比赛列表
        setTimeout(function(){
            // 爬取次数超过300次重新登录
            getdatacount++;
            if (getdatacount>300) {
                getdatacount = 0;
                loginFunc();
            } else {
                getEventIdListParams();
            }
        }, 5000);
    }
}

// 发短信
function sendMsg() {
    
}

// 获取比赛列表
function getMatchs(){
    let html = '';
    // 添加比赛
    for(let key in eventIdList){
        const title = eventIdList[key].title;
        const data = eventIdList[key].data;
        if (data.length>0) {
            html += '<details>';
            html += '<summary>'+title+'</summary>';
            html += '<p>'+data.toString()+'</p>';
            html += '</details>';
        }
    }
    // 拼接html
    return `
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=0" />
            <script src="http://libs.baidu.com/jquery/2.0.0/jquery.min.js"></script>
        </head>
        <body>
            ${html}
        </body>
    </html>
    `;
}

// 网页服务
function webService() {
    const livesHtml = `
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=0" />
            <script src="http://libs.baidu.com/jquery/2.0.0/jquery.min.js"></script>
            <script src="https://cdn.bootcdn.net/ajax/libs/socket.io/2.3.0/socket.io.js"></script>
            <script>
                var audio = false;
                function playTips() { $('#tips')[0].currentTime=0; $('#tips')[0].play(); }
                function playTips2() { $('#tips2')[0].currentTime=0; $('#tips2')[0].play(); }
                function playTips3() { $('#tips3')[0].currentTime=0; $('#tips3')[0].play(); }
                $(function () {
                    var socket = io();
                    socket.on('events', function(data) {
                        var big = data.match(/大单/);
                        var old = $('#content').html();
                        $('#content').html('<br>'+data+'<br>'+old);
                        if(audio) {
                            big ? playTips3() : playTips();
                        }
                    });
                });
                // function setBigdeal () {
                //     var value = $('#bigdeal').val();
                //     if (value==='' || !value.match(/^[0-9]*$/)) {
                //         alert('请输入正确数字');
                //         return;
                //     }
                //     $.get('/setbigdeal?value='+value);
                //     playTips();
                // }
            </script>
        </head>
        <body>
            <audio id="tips" src="/tips.mp3" controls="controls" hidden></audio>
            <audio id="tips2" src="/tips2.mp3" controls="controls" hidden></audio>
            <audio id="tips3" src="/tips3.mp3" controls="controls" hidden></audio>
            <div>
                <input type="text" id="bigdeal" placeholder="大单交易量(默认${bigdeal})" hidden />
                <button onclick="setBigdeal();" hidden>大单设置</button>
                <button onclick="audio = true; playTips();">开启音效</button>
                <button onclick="audio = false; playTips2();">关闭音效</button>
            </div>
            <div>
                <button onclick="$.get('/pushopen?name=dong&type=normal'); playTips();">开启东推送</button>
                <button onclick="$.get('/pushclose?name=dong&type=normal'); playTips2();">关闭东推送</button>
                <button onclick="$.get('/pushopen?name=zhuo&type=normal'); playTips();">开启卓推送</button>
                <button onclick="$.get('/pushclose?name=zhuo&type=normal'); playTips2();">关闭卓推送</button>
                <button onclick="$.get('/pushopen?name=xin&type=normal'); playTips();">开启新推送</button>
                <button onclick="$.get('/pushclose?name=xin&type=normal'); playTips2();">关闭新推送</button>
            </div>
            <div>
                <button onclick="$.get('/pushopen?name=dong&type=big'); playTips();">开启东大推送</button>
                <button onclick="$.get('/pushclose?name=dong&type=big'); playTips2();">关闭东大推送</button>
                <button onclick="$.get('/pushopen?name=zhuo&type=big'); playTips();">开启卓大推送</button>
                <button onclick="$.get('/pushclose?name=zhuo&type=big'); playTips2();">关闭卓大推送</button>
                <button onclick="$.get('/pushopen?name=xin&type=big'); playTips();">开启新大推送</button>
                <button onclick="$.get('/pushclose?name=xin&type=big'); playTips2();">关闭新大推送</button>
            </div>
            <div id="content" style="font-size:14px;"></div>
        </body>
    </html>
    `;
    app.use(express.static('public'));
    app.use(express.json({limit: '50mb'})); // for parsing application/json
    app.use(express.urlencoded({ limit:'50mb', extended: true })); // for parsing application/x-www-form-urlencoded
    // 
    app.get('/', (req, res) => res.send(livesHtml));
    app.get('/matchs', (req, res) => res.send(getMatchs()));
    app.get('/pushopen', (req, res) => {
        console.log('pushopen:', req.query.name, req.query.type);
        if (req.query.type==='normal') {
            if (req.query.name==='dong') push_dong = true;
            if (req.query.name==='zhuo') push_zhuo = true;
            if (req.query.name==='xin') push_xin = true;
        }
        else if (req.query.type==='big') {
            if (req.query.name==='dong') push_dong_big = true;
            if (req.query.name==='zhuo') push_zhuo_big = true;
            if (req.query.name==='xin') push_xin_big = true;
        }
    });
    app.get('/pushclose', (req, res) => {
        console.log('pushclose:', req.query.name, req.query.type);
        if (req.query.type==='normal') {
            if (req.query.name==='dong') push_dong = false;
            if (req.query.name==='zhuo') push_zhuo = false;
            if (req.query.name==='xin') push_xin = false;
        }
        else if (req.query.type==='big') {
            if (req.query.name==='dong') push_dong_big = false;
            if (req.query.name==='zhuo') push_zhuo_big = false;
            if (req.query.name==='xin') push_xin_big = false;
        }
    });
    // app.get('/setbigdeal', (req, res) => {
    //     console.log('setbigdeal:', req.query.value);
    //     if (req.query.value==='' || !req.query.value.match(/^[0-9]*$/)) return;
    //     bigdeal = req.query.value;
    // });
    // 
    app.post('/mission', (req, res) => {
        slavedata = req.body.slavedata;

        // console.log(eventIdList);

        // 合并主从数据
        for (var key in eventIdList) {
            var title = eventIdList[key].title;
            var data = eventIdList[key].data;
            for (var key2 in req.body.eventIdList) {
                var title2 = req.body.eventIdList[key2].title;
                var data2 = req.body.eventIdList[key2].data;
                if (title === title2) {
                    eventIdList[key].data = (data.length > data2.length) ? data : data2;
                }
            }
        }

        // console.log('req.body.eventIdList');
        // console.log(req.body.eventIdList);
        // console.log('eventIdList-after');
        // console.log(eventIdList);

        maildata.push(slavedata);
        finished();
        res.send();
    });
    // socket服务
    io.on('connection', (socket) => {
        console.log('socket已连接');
    });
    // 开启服务
    server.listen(3000, () => { console.log('服务启动'); });
}

webService();

loginFunc();