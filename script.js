const SCRIPT_API_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
const GOOGLE_REVIEW_URL = "https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID";

// قراءة بيانات الموظف من الرابط
const urlParams = new URLSearchParams(window.location.search);
const employeeId = urlParams.get('emp') || 'عام';
const employeeName = urlParams.get('name') || 'موظف عام';

// توليد أو جلب Unique Device ID للعميل
function getDeviceId() {
    let devId = localStorage.getItem('user_unique_id');
    if (!devId) {
        devId = 'DEV-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('user_unique_id', devId);
    }
    return devId;
}

// الحصول على نوع الهاتف/المتصفح
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
        // تسجيل التقييم الإيجابي
        sendLogToBackend("تقييم إيجابي", `تم اختيار ${stars} نجوم`, deviceId, phoneType);
        
        // إظهار الكوبون قبل التحويل لجوجل
        document.getElementById('stars-container').classList.add('hidden');
        document.getElementById('reward-box').classList.remove('hidden');

        setTimeout(() => {
            window.location.href = GOOGLE_REVIEW_URL;
        }, 2000);
    } else {
        // إظهار نموذج الشكاوى
        document.getElementById('stars-container').classList.add('hidden');
        document.getElementById('complaint-form').classList.remove('hidden');
        
        sendLogToBackend("تقييم منخفض (تحويل لشكوى)", `تم اختيار ${stars} نجوم`, deviceId, phoneType);
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