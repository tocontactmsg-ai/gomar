const SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbwsH2CA0nla_YuK0tSkWzHEuJJYIRhx-p-Dcgu4iXTbnhL8P5xjGS3pei3L6KqVCUR2/exec";
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
        makeColumnsResizable();
        if (updateBadge) updateBadge.innerText = "تحديث: " + new Date().toLocaleTimeString('ar-AE');
    } catch (e) {
        console.error("خطأ في جلب البيانات", e);
        if (updateBadge) updateBadge.innerText = "خطأ الاتصال ❌";
    }
}

function setPeriodFilter(period) {
    activePeriod = period;
    document.getElementById('date-from').value = "";
    document.getElementById('date-to').value = "";

    ['all', 'today', 'week', 'month'].forEach(p => {
        const btn = document.getElementById(`btn-period-${p}`);
        if (p === period) {
            btn.className = "px-3 py-1.5 rounded-xl bg-white text-blue-600 shadow-sm";
        } else {
            btn.className = "px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900";
        }
    });

    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const rawLogs = globalData.logs || [];
    const rawComplaints = globalData.complaints || [];

    const dateFrom = document.getElementById('date-from').value ? new Date(document.getElementById('date-from').value) : null;
    const dateTo = document.getElementById('date-to').value ? new Date(document.getElementById('date-to').value) : null;

    // تصفية السجلات حسب الفترة أو مدى التاريخ المخصص
    const filteredLogs = rawLogs.filter((r, idx) => {
        if (idx === 0) return true;
        const rowDate = new Date(r[0]);
        if (dateFrom && rowDate < dateFrom) return false;
        if (dateTo) {
            let nextDay = new Date(dateTo);
            nextDay.setDate(nextDay.getDate() + 1);
            if (rowDate >= nextDay) return false;
        }
        if (!dateFrom && !dateTo) return isDateInPeriod(rowDate, activePeriod);
        return true;
    });

    const filteredComplaints = rawComplaints.filter((r, idx) => {
        if (idx === 0) return true;
        const rowDate = new Date(r[0]);
        if (dateFrom && rowDate < dateFrom) return false;
        if (dateTo) {
            let nextDay = new Date(dateTo);
            nextDay.setDate(nextDay.getDate() + 1);
            if (rowDate >= nextDay) return false;
        }
        if (!dateFrom && !dateTo) return isDateInPeriod(rowDate, activePeriod);
        return true;
    });

    // حساب النجوم والتفاعلات
    let starsCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalStarsSum = 0;
    let totalRatedItems = 0;

    filteredLogs.slice(1).forEach(r => {
        let stars = parseInt(r[6]) || extractStarsFromDetails(r[3]) || 0;
        if (stars >= 1 && stars <= 5) {
            starsCount[stars]++;
            totalStarsSum += stars;
            totalRatedItems++;
        }
    });

    filteredComplaints.slice(1).forEach(r => {
        let stars = parseInt(r[7]) || 2; // افتراضي الشكوى منخفضة
        if (stars >= 1 && stars <= 5) {
            starsCount[stars]++;
            totalStarsSum += stars;
            totalRatedItems++;
        }
    });

    const totalScans = Math.max(0, filteredLogs.length - 1);
    const positiveCount = filteredLogs.filter(r => r[1] && String(r[1]).includes("إيجابي")).length;
    const complaintsCount = Math.max(0, filteredComplaints.length - 1);
    const avgStars = totalRatedItems > 0 ? (totalStarsSum / totalRatedItems).toFixed(1) : "0.0";

    document.getElementById('total-scans').innerText = totalScans;
    document.getElementById('total-positive').innerText = positiveCount;
    document.getElementById('total-complaints').innerText = complaintsCount;
    document.getElementById('avg-stars').innerText = `${avgStars} ⭐`;

    renderStarsChart(starsCount);
    renderComplaintsTable(filteredComplaints);
    renderLogTable(filteredLogs);
}

function extractStarsFromDetails(txt) {
    if (!txt) return 0;
    let match = String(txt).match(/(\d)\s*نجوم/);
    return match ? parseInt(match[1]) : 0;
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
    return true;
}

function renderComplaintsTable(complaints) {
    const compBody = document.getElementById('complaints-table-body');
    compBody.innerHTML = "";
    
    if (!complaints || complaints.length <= 1) {
        compBody.innerHTML = `<tr><td colspan="7" class="p-5 text-center text-slate-400">لا توجد شكاوى مسجلة لهذه الفترة.</td></tr>`;
        return;
    }

    for (let i = complaints.length - 1; i >= 1; i--) {
        const r = complaints[i];
        const dateStr = r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-';
        const starsNum = r[7] || extractStarsFromDetails(r[4]) || 2;
        const starVisual = "⭐".repeat(starsNum);

        compBody.innerHTML += `
            <tr class="hover:bg-rose-50/40 transition">
                <td class="p-3.5 font-mono text-slate-500">${dateStr}</td>
                <td class="p-3.5"><span class="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded text-[11px]">${starVisual} (${starsNum}/5)</span></td>
                <td class="p-3.5 font-bold text-slate-800">${r[1] || 'غير محدد'}</td>
                <td class="p-3.5"><a href="tel:${r[2]}" class="text-blue-600 underline font-bold">${r[2]}</a></td>
                <td class="p-3.5 text-slate-700">${r[3] || 'عام'}</td>
                <td class="p-3.5 font-mono text-purple-600 font-bold">${r[5] || 'N/A'}</td>
                <td class="p-3.5 text-slate-800 leading-relaxed font-semibold">${r[4]}</td>
            </tr>
        `;
    }
}

function renderLogTable(logs) {
    const logBody = document.getElementById('log-table-body');
    logBody.innerHTML = "";
    
    if (!logs || logs.length <= 1) {
        logBody.innerHTML = `<tr><td colspan="6" class="p-5 text-center text-slate-400">لا توجد سجلات لهذه الفترة.</td></tr>`;
        return;
    }

    for (let i = logs.length - 1; i >= 1; i--) {
        const r = logs[i];
        const dateStr = r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-';
        const isPositive = r[1] && String(r[1]).includes("إيجابي");
        const starsNum = r[6] || extractStarsFromDetails(r[3]) || (isPositive ? 5 : 2);
        const tagClass = isPositive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";
        
        logBody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-3.5 font-mono text-slate-400">${dateStr}</td>
                <td class="p-3.5"><span class="px-2.5 py-1 rounded-lg text-[11px] font-bold ${tagClass}">${r[1]} (${starsNum}★)</span></td>
                <td class="p-3.5 text-blue-600 font-medium">${r[2]}</td>
                <td class="p-3.5 text-slate-600">${r[3]}</td>
                <td class="p-3.5 font-mono text-purple-600">${r[4] || 'N/A'}</td>
                <td class="p-3.5 text-slate-500">${r[5] || '-'}</td>
            </tr>
        `;
    }
}

function renderStarsChart(starsData) {
    const canvas = document.getElementById('starsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1 نجمة ⭐', '2 نجمتان ⭐⭐', '3 نجوم ⭐⭐⭐', '4 نجوم ⭐⭐⭐⭐', '5 نجوم ⭐⭐⭐⭐⭐'],
            datasets: [{
                label: 'عدد التقييمات',
                data: [starsData[1], starsData[2], starsData[3], starsData[4], starsData[5]],
                backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#14b8a6', '#10b981'],
                borderRadius: 8
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

// جعل الأعمدة قابلة للتكبير عبر السحب (Draggable Column Resizing)
function makeColumnsResizable() {
    document.querySelectorAll('.resizable-table').forEach(table => {
        const cols = table.querySelectorAll('th');
        cols.forEach(col => {
            const resizer = col.querySelector('.resizer');
            if (!resizer) return;

            let x = 0;
            let w = 0;

            const mouseDownHandler = function (e) {
                x = e.clientX;
                const styles = window.getComputedStyle(col);
                w = parseInt(styles.width, 10);

                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
                resizer.classList.add('resizing');
            };

            const mouseMoveHandler = function (e) {
                const dx = e.clientX - x;
                col.style.width = `${w - dx}px`; // RTL Handling
            };

            const mouseUpHandler = function () {
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
                resizer.classList.remove('resizing');
            };

            resizer.addEventListener('mousedown', mouseDownHandler);
        });
    });
}

function filterTables() {
    const q = document.getElementById('search-input').value.toLowerCase();
    
    document.querySelectorAll('#complaints-table-body tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    });

    document.querySelectorAll('#log-table-body tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

setInterval(loadData, 30000);
loadData();
