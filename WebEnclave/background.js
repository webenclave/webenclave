//Verify TokenHash
$we = {
    mapVerifyHash: new Map(),
    mapTabInfo: new Map(),
    mapCookies: new Map()
}


//Begin load from storage
chrome.storage.local.get('COOKIE', function (items) {
    console.log(items);

    for (let k in items) {
        $we.mapCookies.set(k, items[k]);
    }

});

//process message
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    let tabId = sender.tab.id;
    let frameId = sender.frameId;
    let url = sender.url;

    let cmd = request['cmd'];

    switch (cmd) {
        case 'Verify': {
            let res = $we.mapVerifyHash.get(`__${tabId}_${frameId}`);
            console.log(`__${tabId}_${frameId} = ${res.token}`);
            console.log(request);
            if (!res || request['token'] != res['token']) {
                break;
                chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL('block.html')
                });
            }

            $we.mapTabInfo.set(tabId, {
                enclaveNum: request['num'],
                frameId: frameId,
                url: sender.url,
                origin: request['origin']
            });

            //Pass
            chrome.tabs.sendMessage(tabId, { cmd: "Init", tabId: tabId });

            break;
        }
        default: {
            console.log(request);
            sendResponse({ cmd: 'Error' });
        }
    }

});


//Verify && fetch cookie
function responseStartedCallback(details) {

    //ignore local request
    if (details.url.startsWith('chrome-extension')) {
        return;
    }


    let tabId = details.tabId;
    let frameId = details.frameId;
    let xenclave;

    details.responseHeaders.forEach(val => {
        if (val.name.toLowerCase() === 'x-enclave') {
            xenclave = val.value;
        }
    });

    if (xenclave) {
        $we.mapVerifyHash.set(`__${tabId}_${frameId}`, {
            url: details.url,
            token: xenclave
        });
    }

    //process set-cookie inside enclaves
    if (details['initiator'] == "null" && details['type'] != "main_frame") {
        console.log(details);

        let arrCookies = [];
        details.responseHeaders.forEach(val => {
            if (val.name.toLowerCase() === 'set-cookie') {
                arrCookies.push(val.value);
            }
        });

        //process cookie
        let ut = ~~(Date.now() / 1000);
        for (let cookieStr of arrCookies) {

            //for store
            let cookieDetail = {};

            let arrCookieStr = cookieStr.split(';');
            let cookieKV = arrCookieStr[0].split('=');

            cookieDetail['Name'] = cookieKV[0];
            cookieDetail['Value'] = cookieKV[1];
            cookieDetail['Domain'] = "*"

            //process option
            let arrOps = arrCookieStr.slice(1);
            for (let ops of arrOps) {

                let arrOpsKV = ops.split('=');
                if (arrOpsKV.length == 2) {

                    let opsK = arrOpsKV[0];
                    let opsV = arrOpsKV[1];

                    switch (opsK.trim().toLowerCase()) {
                        case "expires": {
                            if (!cookieDetail['expires']) {
                                cookieDetail['expires'] = ~~(+new Date(opsV) / 1000)
                            }
                            break;
                        }
                        case "domain": {
                            cookieDetail['Domain'] = opsV;
                            break;
                        }
                        case "Path": {
                            cookieDetail['Path'] = opsV;
                            break;
                        }
                        case "Max-Age": {
                            //overwrite Expires setting
                            cookieDetail['expires'] = ut + opsV;
                            break;
                        }
                        case "SameSite": {
                            cookieDetail['SameSite'] = opsV;
                            break;
                        }

                        default: {
                            console.log(arrOpsKV);
                        }
                    }

                }
                else {
                    cookieDetail[arrOpsKV[0].trim()] = true;
                    //Secure, HttpOnly ...
                    //Process if needed in the future
                }

            }

            //add cookie to map
            let arrCookieFromDomain = $we.mapCookies.get(cookieDetail['Domain']);

            if (arrCookieFromDomain) {

                for (let i = 0; i < arrCookieFromDomain.length; i++) {
                    if (arrCookieFromDomain[i].Name == cookieDetail.Name) {
                        arrCookieFromDomain[i] = cookieDetail;
                        cookieDetail = null;
                        console.log('break');
                        break;
                    }
                }

                if (cookieDetail) {
                    arrCookieFromDomain.push(cookieDetail);
                }

            }
            else {
                $we.mapCookies.set(cookieDetail['Domain'], [cookieDetail]);
            }


        }


    }


}
chrome.webRequest.onResponseStarted.addListener(responseStartedCallback, { urls: ["<all_urls>"] }, ['responseHeaders', 'extraHeaders']);


//set cookie
function beforeSendHeadersCallBack(details) {

    if (details['initiator'] == "null" && details['type'] != "main_frame") {
        console.log(details);

        let tabId = details.tabId;
        let tabInfo = $we.mapTabInfo.get(tabId);

        if (!tabInfo) {
            return;
        }

        let origin = tabInfo.origin;
        let url = tabInfo.url;

        let arrProcessCookies = [];

        //add origin cookie
        let arrCookie = $we.mapCookies.get(origin);
        if (arrCookie) {
            arrProcessCookies.push(...arrCookie);
        }

        //add * cookie
        arrCookie = $we.mapCookies.get("*");
        if (arrCookie) {
            arrProcessCookies.push(...arrCookie);
        }

        if (arrProcessCookies.length == 0) {
            //no cookie need to add
            return;
        }

        let arrCookieStr = [];
        for (let cookie of arrProcessCookies) {

            //check path here in the future.
            console.log(cookie);
            arrCookieStr.push(`${cookie.Name}=${cookie.Value}`);

        }

        let cookieStr = arrCookieStr.join(';');

        details.requestHeaders.push({
            name: 'cookie',
            value: cookieStr
        });

        return { requestHeaders: details.requestHeaders };

    }

}
chrome.webRequest.onBeforeSendHeaders.addListener(beforeSendHeadersCallBack, { urls: ["<all_urls>"] }, ['blocking', 'requestHeaders', 'extraHeaders']);

//process CORS
function headersReceivedCallback(details) {

    //bypass CORS check
    if (details['initiator'] == "null" && details['type'] != "main_frame") {
        //console.log(details);

        details.responseHeaders.push({
            name: "Access-Control-Allow-Origin",
            value: "*"
        });

        return { responseHeaders: details.responseHeaders };

    }

}
chrome.webRequest.onHeadersReceived.addListener(headersReceivedCallback, { urls: ["<all_urls>"] }, ['blocking', 'responseHeaders', 'extraHeaders']);

//process ignore
function actionIgnoredCallback(details) {

}
chrome.webRequest.onActionIgnored.addListener(actionIgnoredCallback);


//serialization of cookie map
chrome.runtime.onSuspend.addListener(function () {

    let cookieStore = Object.create(null);

    for (let [k, v] of $we.mapCookies) {
        cookieStore[k] = v;
    }

    chrome.storage.local.set(COOKIE, cookieStore);

});


