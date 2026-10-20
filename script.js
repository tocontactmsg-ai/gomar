const SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbznQ-8paK314Sw74hUI4BP92DdyHR-ysDMp2Yn7YPuHZPXRDuQrC_6lroj5ttGARKZh/exec";
const GOOGLE_REVIEW_URL = "https://www.google.com/maps/place/%D9%85%D8%B3%D8%AC%D8%AF+%D8%A7%D9%84%D8%B3%D9%8A%D8%AF%D8%A9+%D8%AE%D8%AF%D9%8A%D8%AC%D8%A9+%D8%B1%D8%B6%D9%8A+%D8%A7%D9%84%D9%84%D9%87+%D8%B9%D9%86%D9%87%D8%A7%E2%80%AD/@25.2848258,55.6730083,13z/data=!4m6!3m5!1s0x3ef58d6a26c1ded7:0xf87a5958ff53f9e9!8m2!3d25.2848146!4d55.6436769!16s%2Fg%2F11tn70cps_?entry=ttu&g_ep=EgoyMDI2MTAxOC4wIKXMDSoASAFQAw%3D%3D";

const urlParams = new URLSearchParams(window.location.search);
const employeeId = urlParams.get('emp') || 'عام';
const employeeName = urlParams.get('name') || 'موظف عام';

function getDeviceId() {
    let devId = localStorage.getItem('user_unique_id');
    if (!devId) {
        devId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('user_unique_id', devId);
    }
    return devId;
}

function getPhoneType() {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "iOS (iPhone)";
    if (/Macintosh/.test(ua)) return "Mac Computer";
    if (/Windows/.test(ua)) return "Windows PC";
    return "متصفح آخر";
}

function rate(stars) {
    const deviceId = getDeviceId();
    const phoneType = getPhoneType();

    if (stars >= 4) {
        // تسجيل النجوم الإيجابية وتحويل العميل فقط
        sendLogToBackend("تقييم إيجابي", `تم اختيار ${stars} نجوم للموظف: ${employeeName}`, deviceId, phoneType);
        
        document.getElementById('stars-container').classList.add('hidden');
        document.getElementById('reward-box').classList.remove('hidden');

        setTimeout(() => {
            window.location.href = GOOGLE_REVIEW_URL;
        }, 2000);
    } else {
        // إظهار نموذج الشكاوى للنجوم المنخفضة دون تحويل لجوجل
        document.getElementById('stars-container').classList.add('hidden');
        document.getElementById('complaint-form').classList.remove('hidden');
        
        sendLogToBackend("تقييم منخفض (شكوى)", `تم اختيار ${stars} نجوم للموظف: ${employeeName}`, deviceId, phoneType);
    }
}

async function submitComplaint(event) {
    event.preventDefault();
    
    const name = document.getElementById('client-name').value;
    const phone = document.getElementById('client-phone').value;
    const message = document.getElementById('client-message').value;

    const payload = {
        type: "complaint",
        employeeId: employeeId,
        employeeName: employeeName,
        clientName: name,
        phone: phone,
        message: message,
        deviceId: getDeviceId(),
        phoneType: getPhoneType()
    };

    try {
        await fetch(SCRIPT_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        document.getElementById('complaint-form').classList.add('hidden');
        document.getElementById('reward-box').classList.remove('hidden');
    } catch (err) {
        alert("حدث خطأ في الإرسال، يرجى المحاولة مرة أخرى.");
    }
}

function sendLogToBackend(action, details, deviceId, phoneType) {
    fetch(SCRIPT_API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: "log",
            action: action,
            employeeName: employeeName,
            details: details,
            deviceId: deviceId,
            phoneType: phoneType
        })
    });
}
