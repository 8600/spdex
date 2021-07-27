const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const port = 3000;
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

app.use(bodyParser.urlencoded({extended:true}));

app.get('/getmail', function (req, res) {
    // console.log(req.query);
    var user = req.query.user;
    var pass = req.query.pass;
    var content = req.query.content;
    sendMail(content, { user, pass });
    res.end('ok');
});

app.post('/postmail', function (req, res) {
    // console.log(req.body);
    var user = req.body.user;
    var pass = req.body.pass;
    var content = req.body.content;
    sendMail(content, { user, pass });
    res.end('ok');
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));