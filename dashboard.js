const SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbzpuQpdA5_ygYUt8jBQBDf8e2T-GwFjdoRC7vrtPFppwRANCyhiE3tQ4AsVihfWaxY3/exec";
let chartInstance = null;

async function loadData() {
    const updateBadge = document.getElementById('last-update');
    if (updateBadge) updateBadge.innerText = "جاري جلب البيانات... ⏳";

    try {
        const res = await fetch(SCRIPT_API_URL);
        const data = await res.json();
        
        renderDashboard(data);
        if (updateBadge) updateBadge.innerText = "تم التحديث: " + new Date().toLocaleTimeString('ar-AE');
    } catch (e) {
        console.error("خطأ في جلب البيانات", e);
        if (updateBadge) updateBadge.innerText = "خطأ في الاتصال بالسيرفر ❌";
    }
}

function renderDashboard(data) {
    const logs = data.logs || [];
    const complaints = data.complaints || [];

    const totalScans = Math.max(0, logs.length - 1);
    const positiveCount = logs.filter(r => r[1] && String(r[1]).includes("إيجابي")).length;
    const complaintsCount = Math.max(0, complaints.length - 1);

    document.getElementById('total-scans').innerText = totalScans;
    document.getElementById('total-positive').innerText = positiveCount;
    document.getElementById('total-complaints').innerText = complaintsCount;

    renderChart(positiveCount, complaintsCount, Math.max(0, totalScans - positiveCount - complaintsCount));
    renderComplaintsTable(complaints);
    renderLogTable(logs);
}

function renderComplaintsTable(complaints) {
    const compBody = document.getElementById('complaints-table');
    compBody.innerHTML = "";
    
    if (!complaints || complaints.length <= 1) {
        compBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">لا توجد شكاوى مسجلة حتى الآن.</td></tr>`;
        return;
    }

    for (let i = complaints.length - 1; i >= 1; i--) {
        const r = complaints[i];
        const dateStr = r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-';
        compBody.innerHTML += `
            <tr class="hover:bg-red-50/50">
                <td class="p-3 text-xs text-gray-500">${dateStr}</td>
                <td class="p-3 font-semibold">${r[1] || 'غير محدد'}</td>
                <td class="p-3"><a href="tel:${r[2]}" class="text-blue-600 underline font-bold">${r[2]}</a></td>
                <td class="p-3">${r[3] || 'عام'}</td>
                <td class="p-3 font-mono text-xs text-purple-600 font-bold">${r[5] || 'N/A'}</td>
                <td class="p-3 text-xs bg-gray-100 rounded px-2 text-center">${r[6] || 'غير معروف'}</td>
                <td class="p-3"><span class="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full font-bold">🚨 شكوى</span> ${r[4]}</td>
            </tr>
        `;
    }
}

function renderLogTable(logs) {
    const logBody = document.getElementById('log-table');
    logBody.innerHTML = "";
    
    if (!logs || logs.length <= 1) {
        logBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-400">لا توجد سجلات بعد.</td></tr>`;
        return;
    }

    for (let i = logs.length - 1; i >= 1; i--) {
        const r = logs[i];
        const dateStr = r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-';
        const isPositive = r[1] && String(r[1]).includes("إيجابي");
        const tagClass = isPositive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700";
        
        logBody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-3 text-xs text-gray-400">${dateStr}</td>
                <td class="p-3"><span class="px-2 py-0.5 rounded text-xs font-bold ${tagClass}">${r[1]}</span></td>
                <td class="p-3 text-blue-600">${r[2]}</td>
                <td class="p-3 text-gray-600 text-xs">${r[3]}</td>
                <td class="p-3 font-mono text-xs text-purple-600">${r[4] || 'N/A'}</td>
                <td class="p-3 text-xs text-gray-500">${r[5] || '-'}</td>
            </tr>
        `;
    }
}

function filterTables() {
    const q = document.getElementById('search-input').value.toLowerCase();
    
    document.querySelectorAll('#complaints-table tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    });

    document.querySelectorAll('#log-table tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

function renderChart(positive, complaints, others) {
    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['تحويل إيجابي (جوجل)', 'شكاوى داخلية', 'تفاعلات أخرى'],
            datasets: [{
                label: 'عدد التفاعلات',
                data: [positive, complaints, others],
                backgroundColor: ['#22c55e', '#ef4444', '#3b82f6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// تحديث تلقائي كل 30 ثانية
setInterval(loadData, 30000);
loadData();
