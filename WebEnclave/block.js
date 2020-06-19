//Init hide detail
var isShowDetail = false;
var showDetailText = "DETAILS";
var hideDetailText = "HIDE DETAILS";
var MetaObj;


document.getElementById('backToSafe').addEventListener('click', function () {
    history.go(-2);
});

//get params from URL
(function () {

    let url = location.search;

    if (url) {

        let str = atob(url.substr(1));
        let obj = JSON.parse(str);

        /*
            obj = {
                url: "cn126.com",
                type: 0=>Phishing,
                source: "PhishTank"
            };
        */

        document.getElementById('maliciousUrlContent').innerText = obj.url;

        if (obj["type"]) {
            document.getElementById('withtype').style.display = "block";
            document.getElementById('typeInfo').innerText = obj.type;
        }
        if (obj["source"]) {
            document.getElementById('withsource').style.display = "block";
            document.getElementById('providedInfo').innerText = obj.source;
        }

        MetaObj = obj;

    }

})();