const SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbykMW4uXSm3daQuyEToMWKtorLxmp_ljmFWf5x4rnHeFqpsLuW3kmdGJAVKZsRsm2Js/exec";
const GOOGLE_REVIEW_URL = "https://www.google.com/maps/place/%D9%85%D8%B3%D8%AC%D8%AF+%D8%A7%D9%84%D8%B3%D9%8A%D8%AF%D8%A9+%D8%AE%D8%AF%D9%8A%D8%AC%D8%A9+%D8%B1%D8%B6%D9%8A+%D8%A7%D9%84%D9%84%D9%87+%D8%B9%D9%86%D9%87%D8%A7%E2%80%AD/@25.2848258,55.6730083,13z/data=!4m6!3m5!1s0x3ef58d6a26c1ded7:0xf87a5958ff53f9e9!8m2!3d25.2848146!4d55.6436769!16s%2Fg%2F11tn70cps_?entry=ttu&g_ep=EgoyMDI2MTAxOC4wIKXMDSoASAFQAw%3D%3D";

let userIpAddress = "جاري الجلب...";

async function fetchUserIP() {
    try {
        let res = await fetch('https://api.ipify.org?format=json');
        let data = await res.json();
        if (data.ip) userIpAddress = data.ip;
    } catch (e) {
        try {
            let res2 = await fetch('https://ipapi.co/json/');
            let data2 = await res2.json();
            if (data2.ip) userIpAddress = data2.ip;
        } catch (err) {
            userIpAddress = "غير متاح";
        }
    }
}
fetchUserIP();

function getDeviceId() {
    let devId = localStorage.getItem('user_unique_id');
    if (!devId) {
        devId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('user_unique_id', devId);
    }
    return devId;
}
// دالة ذكية ومحدثة لجلب نوع وطراز الهاتف/الكمبيوتر بدقة عالية
function getPhoneDetails() {
    const ua = navigator.userAgent;

    // 1. فحص أجهزة أبل (iOS / Mac)
    if (/iPhone/i.test(ua)) return "iPhone";
    if (/iPad/i.test(ua)) return "iPad";
    if (/Macintosh|Mac OS X/i.test(ua)) return "كمبيوتر Mac";

    // 2. فحص أجهزة أندرويد واستخراج الطراز بدقة
    if (/Android/i.test(ua)) {
        // محاولة استخراج اسم الموديل المكتوب في الـ UserAgent
        let modelMatch = ua.match(/Android\s+[\d\.]+;\s*([^;\)]+)/i);
        let model = modelMatch && modelMatch[1] ? modelMatch[1].trim() : "";

        // تنظيف النص وتوضيح الشركة والموديل
        if (/SM-|Samsung/i.test(ua) || /SM-/i.test(model)) {
            return "سامسونج (" + (model.replace(/Build.*/i, '').trim() || "Galaxy") + ")";
        }
        if (/Redmi|Xiaomi|POCO|Mi/i.test(ua)) {
            return "شاومي/ريدمي (" + (model.replace(/Build.*/i, '').trim() || "Redmi") + ")";
        }
        if (/HUAWEI|HONOR|VOG-|ELE-|ALN-/i.test(ua)) {
            return "هواوي/هونر (" + (model.replace(/Build.*/i, '').trim() || "Huawei") + ")";
        }
        if (/Pixel/i.test(ua)) {
            return "جوجل بكسل (" + (model.replace(/Build.*/i, '').trim() || "Pixel") + ")";
        }
        if (/OPPO|CPH/i.test(ua)) {
            return "أوبو (" + (model.replace(/Build.*/i, '').trim() || "OPPO") + ")";
        }
        if (/Realme|RMX/i.test(ua)) {
            return "ريلمي (" + (model.replace(/Build.*/i, '').trim() || "Realme") + ")";
        }
        if (/OnePlus|DN2103|NE2213/i.test(ua)) {
            return "ون بلس";
        }
        
        return model ? "أندرويد (" + model.replace(/Build.*/i, '').trim() + ")" : "هاتف أندرويد";
    }

    // 3. فحص أجهزة أسطح المكتب (Windows / Linux)
    if (/Windows NT/i.test(ua)) return "كمبيوتر Windows";
    if (/Linux/i.test(ua)) return "كمبيوتر Linux";

    return "جهاز غير معروف";
}
let isHighReview = false;

function rate(stars) {
    const deviceId = getDeviceId();
    const phoneModel = getPhoneDetails();

    if (stars >= 4) {
        isHighReview = true;
        sendLogToBackend("تقييم إيجابي", `تم اختيار ${stars} نجوم`, deviceId, phoneModel, stars);
        document.getElementById('stars-container').classList.add('hidden');
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('reward-box').classList.remove('hidden');
    } else {
        isHighReview = false;
        document.getElementById('stars-container').classList.add('hidden');
        document.getElementById('complaint-form').classList.remove('hidden');
        sendLogToBackend("تقييم منخفض (شكوى)", `تم اختيار ${stars} نجوم`, deviceId, phoneModel, stars);
    }
}

function downloadAndRedirect() {
    const card = document.getElementById('coupon-card');
    const statusText = document.getElementById('download-status');
    const btn = document.getElementById('download-btn');

    btn.disabled = true;
    statusText.classList.remove('hidden');

    html2canvas(card, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'Discount-Coupon.png';
        link.href = canvas.toDataURL('image/png');
        link.click();

        setTimeout(() => {
            if (isHighReview) {
                sendLogToBackend("انتقال لصفحة جوجل", "تم التوجيه لخرائط جوجل", getDeviceId(), getPhoneDetails(), 5);
                window.location.href = GOOGLE_REVIEW_URL;
            } else {
                statusText.innerText = "تم حفظ الكوبون بنجاح! شكراً لتعاونك معنا ✅";
                btn.classList.add('hidden');
            }
        }, 1500);
    });
}

async function submitComplaint(event) {
    event.preventDefault();
    const name = document.getElementById('client-name').value;
    const phone = document.getElementById('client-phone').value;
    const message = document.getElementById('client-message').value;

    const payload = {
        type: "complaint",
        clientName: name,
        phone: phone,
        message: message,
        deviceId: getDeviceId(),
        phoneModel: getPhoneDetails(),
        stars: 2,
        userIp: userIpAddress
    };

    try {
        await fetch(SCRIPT_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        document.getElementById('complaint-form').classList.add('hidden');
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('reward-box').classList.remove('hidden');
    } catch (err) {
        alert("حدث خطأ في الإرسال، يرجى المحاولة مرة أخرى.");
    }
}

function sendLogToBackend(action, details, deviceId, phoneModel, stars) {
    fetch(SCRIPT_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: "log",
            action: action,
            details: details,
            deviceId: deviceId,
            phoneModel: phoneModel,
            stars: stars || 0,
            userIp: userIpAddress
        })
    });
}
