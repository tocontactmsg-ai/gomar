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

// معرّف ثابت للجهاز كمرجع أساسي
function getDeviceId() {
    let devId = localStorage.getItem('user_unique_id');
    if (!devId) {
        devId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('user_unique_id', devId);
    }
    return devId;
}

// توليد معرّف فريد تماماً لكل إدخال أو تفاعل جديد (Unique Input / Event ID)
function generateUniqueInputId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INP-${timestamp}-${randomPart}`;
}

// توليد رقم كوبون مرجعي جديد كلياً مع كل عملية تقييم إيجابي
function generateUniqueCouponRef() {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const timeCode = Date.now().toString().slice(-4);
    return `VIP-${randomNum}-${timeCode}`;
}

function getUniqueFingerprint() {
    let fingerprint = localStorage.getItem('unique_client_fp');
    if (!fingerprint) {
        const screenRes = `${window.screen.width}x${window.screen.height}`;
        const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
        fingerprint = `UID-${screenRes}-${randomString}`;
        localStorage.setItem('unique_client_fp', fingerprint);
    }
    return fingerprint;
}

function getDeviceTypeAndModel() {
    return `زائر رقمي [${getUniqueFingerprint()}]`;
}

let isHighReview = false;
let currentCouponRef = "-"; // لتخزين رقم الكوبون الحالي لهذه الجلسة

function rate(stars) {
    const deviceId = getDeviceId();
    const phoneModel = getDeviceTypeAndModel();
    const inputId = generateUniqueInputId(); // معرّف فريد لكل ضغطة إدخال

    if (stars >= 4) {
        isHighReview = true;
        currentCouponRef = generateUniqueCouponRef(); // توليد رقم كوبون فريد جديد تماماً لكل تقييم

        // تحديث النص في واجهة المستخدم إن وجد
        const couponEl = document.getElementById('coupon-code-text');
        if (couponEl) couponEl.innerText = currentCouponRef;

        sendLogToBackend("تقييم إيجابي", `تم اختيار ${stars} نجوم`, deviceId, phoneModel, stars, currentCouponRef, inputId);
        
        document.getElementById('stars-container').classList.add('hidden');
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('reward-box').classList.remove('hidden');
    } else {
        isHighReview = false;
        currentCouponRef = "-";
        
        document.getElementById('stars-container').classList.add('hidden');
        document.getElementById('complaint-form').classList.remove('hidden');
        
        sendLogToBackend("تقييم منخفض (شكوى)", `تم اختيار ${stars} نجوم`, deviceId, phoneModel, stars, "-", inputId);
    }
}

function downloadAndRedirect() {
    const card = document.getElementById('coupon-card');
    const statusText = document.getElementById('download-status');
    const btn = document.getElementById('download-btn');
    const inputId = generateUniqueInputId();

    btn.disabled = true;
    statusText.classList.remove('hidden');

    html2canvas(card, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Discount-Coupon-${currentCouponRef}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        setTimeout(() => {
            if (isHighReview) {
                sendLogToBackend("انتقال لصفحة جوجل", `تم التوجيه لخرائط جوجل | كود: ${currentCouponRef}`, getDeviceId(), getDeviceTypeAndModel(), 5, currentCouponRef, inputId);
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
    const inputId = generateUniqueInputId();

    const payload = {
        type: "complaint",
        clientName: name,
        phone: phone,
        message: message,
        deviceId: getDeviceId(),
        phoneModel: getDeviceTypeAndModel(),
        stars: 2,
        userIp: userIpAddress,
        couponRef: "-",
        inputId: inputId
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

function sendLogToBackend(action, details, deviceId, phoneModel, stars, couponRef, inputId) {
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
            userIp: userIpAddress,
            couponRef: couponRef || "-",
            inputId: inputId || generateUniqueInputId()
        })
    });
}
