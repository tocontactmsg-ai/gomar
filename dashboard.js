const SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbzpuQpdA5_ygYUt8jBQBDf8e2T-GwFjdoRC7vrtPFppwRANCyhiE3tQ4AsVihfWaxY3/exec";

let globalData = { logs: [], complaints: [] };
let activePeriod = 'all';
let chartInstance = null;

async function loadData() {
    const updateBadge = document.getElementById('last-update');
    if (updateBadge) updateBadge.innerText = "جاري المزامنة... ⏳";

    try {
        const res = await fetch(SCRIPT_API_URL);
        globalData = await res.json();
        
        applyFiltersAndRender();
        if (updateBadge) updateBadge.innerText = "تحديث: " + new Date().toLocaleTimeString('ar-AE');
    } catch (e) {
        console.error("خطأ في جلب البيانات", e);
        if (updateBadge) updateBadge.innerText = "خطأ الاتصال ❌";
    }
}

function setPeriodFilter(period) {
    activePeriod = period;
    
    // تحديث شكل الأزرار
    ['all', 'today', 'week', 'month'].forEach(p => {
        const btn = document.getElementById(`filter-${p}`);
        if (p === period) {
            btn.className = "px-3 py-1.5 rounded-lg font-bold bg-white text-slate-800 shadow-sm transition";
        } else {
            btn.className = "px-3 py-1.5 rounded-lg font-medium text-slate-600 hover:text-slate-900 transition";
        }
    });

    applyFiltersAndRender();
}

function isDateInPeriod(dateObj, period) {
    if (!dateObj || isNaN(dateObj.getTime())) return true;
    const now = new Date();
    
    if (period === 'today') {
        return dateObj.toDateString() === now.toDateString();
    } else if (period === 'week') {
        const oneWeekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        return dateObj >= oneWeekAgo;
    } else if (period === 'month') {
        return dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    }
    return true; // all
}

function applyFiltersAndRender() {
    const rawLogs = globalData.logs || [];
    const rawComplaints = globalData.complaints || [];

    // تصفية اللوغ حسب الفترة
    const filteredLogs = rawLogs.filter((r, idx) => {
        if (idx === 0) return true; // السطر الأول هيدر
        return isDateInPeriod(new Date(r[0]), activePeriod);
    });

    // تصفية الشكاوى حسب الفترة
    const filteredComplaints = rawComplaints.filter((r, idx) => {
        if (idx === 0) return true;
        return isDateInPeriod(new Date(r[0]), activePeriod);
    });

    const totalScans = Math.max(0, filteredLogs.length - 1);
    const positiveCount = filteredLogs.filter(r => r[1] && String(r[1]).includes("إيجابي")).length;
    const complaintsCount = Math.max(0, filteredComplaints.length - 1);

    document.getElementById('total-scans').innerText = totalScans;
    document.getElementById('total-positive').innerText = positiveCount;
    document.getElementById('total-complaints').innerText = complaintsCount;

    renderChart(positiveCount, complaintsCount, Math.max(0, totalScans - positiveCount - complaintsCount));
    renderComplaintsTable(filteredComplaints);
    renderLogTable(filteredLogs);
}

function renderComplaintsTable(complaints) {
    const compBody = document.getElementById('complaints-table');
    compBody.innerHTML = "";
    
    if (!complaints || complaints.length <= 1) {
        compBody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-400">لا توجد شكاوى مسجلة لهذه الفترة.</td></tr>`;
        return;
    }

    for (let i = complaints.length - 1; i >= 1; i--) {
        const r = complaints[i];
        const dateStr = r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-';
        compBody.innerHTML += `
            <tr class="hover:bg-rose-50/40 transition">
                <td class="p-3 font-mono text-slate-500">${dateStr}</td>
                <td class="p-3 font-bold text-slate-800">${r[1] || 'غير محدد'}</td>
                <td class="p-3"><a href="tel:${r[2]}" class="text-blue-600 underline font-bold">${r[2]}</a></td>
                <td class="p-3 text-slate-700">${r[3] || 'عام'}</td>
                <td class="p-3 font-mono text-purple-600 font-bold">${r[5] || 'N/A'}</td>
                <td class="p-3 text-slate-500">${r[6] || 'غير معروف'}</td>
                <td class="p-3 text-rose-700 font-medium">${r[4]}</td>
            </tr>
        `;
    }
}

function renderLogTable(logs) {
    const logBody = document.getElementById('log-table');
    logBody.innerHTML = "";
    
    if (!logs || logs.length <= 1) {
        logBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">لا توجد سجلات لهذه الفترة.</td></tr>`;
        return;
    }

    for (let i = logs.length - 1; i >= 1; i--) {
        const r = logs[i];
        const dateStr = r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-';
        const isPositive = r[1] && String(r[1]).includes("إيجابي");
        const tagClass = isPositive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";
        
        logBody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-3 font-mono text-slate-400">${dateStr}</td>
                <td class="p-3"><span class="px-2.5 py-1 rounded-md text-[11px] font-bold ${tagClass}">${r[1]}</span></td>
                <td class="p-3 text-blue-600 font-medium">${r[2]}</td>
                <td class="p-3 text-slate-600">${r[3]}</td>
                <td class="p-3 font-mono text-purple-600">${r[4] || 'N/A'}</td>
                <td class="p-3 text-slate-500">${r[5] || '-'}</td>
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
            labels: ['إيجابي (جوجل)', 'شكاوى داخلية', 'تفاعلات أخرى'],
            datasets: [{
                data: [positive, complaints, others],
                backgroundColor: ['#10b981', '#f43f5e', '#3b82f6'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

setInterval(loadData, 30000);
loadData();
