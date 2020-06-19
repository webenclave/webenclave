const argv = require('yargs').argv;
const crypto = require('crypto');
const http = require('http');
const httpProxy = require('http-proxy');

//read the arguments
var src = 'localhost';
if (argv.src) {
    src = argv.src;
}


var des = 'localhost';
if (argv.des) {
    des = argv.des;
}


var port = '80';
if (argv.port) {
    port = argv.port;
}

var out = '3000';
if (argv.out) {
    out = argv.out;
}


// 新建一个代理 Proxy Server 对象  
var proxy = httpProxy.createProxyServer({});

// 捕获异常
proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    res.end('WebEnclave Proxy went wrong.');
});

proxy.on('proxyRes', function (proxyRes, req, res) {
    var body = [];
    proxyRes.on('data', function (chunk) {
        body.push(chunk);
    });

    proxyRes.on('end', function () {

        //if 304

        if (proxyRes.statusCode == 304) {
            res.writeHead(304);
            res.end();
            return;
        }


        body = Buffer.concat(body);
        html = body.toString().replace(/\r\n/g, "").replace(/\n/g, "").replace(/\s+/g, "");

        let resArr = html.match(/<web-enclave.*?<\/web-enclave>/gi);
        if (resArr && resArr.length !== 0) {

            let enclaveHtml = resArr.join('|').replace(/\/>/g, ">").replace(/=""/g, "");

            //console.log(`enclaveHtml:\n${enclaveHtml}`);
            //console.log(`length: ${enclaveHtml.length}`);

            const hash = crypto.createHash('sha256');
            hash.update(enclaveHtml);
            let root = hash.digest('hex');

            res.setHeader('X-Enclave', root);

            for (let k in proxyRes.headers) {
                res.setHeader(k, proxyRes.headers[k]);
                //console.log(`${k} = ${proxyRes.headers[k]}`);
            }

            //console.log(`root: ${root}`)

        }


        res.end(body);
    });
});

// 在每次请求中，调用 proxy.web(req, res config) 方法进行请求分发  
var server = http.createServer(function (req, res) {

    var option = {
        target: `http://${src}:${out}`,
        selfHandleResponse: true
    };

    var host = req.headers.host;
    switch (host) {
        case src:
            proxy.web(req, res, option);
            break;
        default:
            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });
            res.end('Welcome to WebEnclave Proxy!');
    }

});

console.log(`listening on port ${port}`);
console.log(`[${src}:${port}] => [${des}:${out}]`);
server.listen(port);

