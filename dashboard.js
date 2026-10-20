const SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbwsH2CA0nla_YuK0tSkWzHEuJJYIRhx-p-Dcgu4iXTbnhL8P5xjGS3pei3L6KqVCUR2/exec";
let globalData = { logs: [], complaints: [] };
let activePeriod = 'all';
let selectedStarFilter = null;
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

function resetStarFilter() {
    selectedStarFilter = null;
    document.getElementById('active-star-badge').classList.add('hidden');
    document.getElementById('reset-star-filter').classList.add('hidden');
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const rawLogs = globalData.logs || [];
    const rawComplaints = globalData.complaints || [];

    const dateFrom = document.getElementById('date-from').value ? new Date(document.getElementById('date-from').value) : null;
    const dateTo = document.getElementById('date-to').value ? new Date(document.getElementById('date-to').value) : null;

    let filteredLogs = rawLogs.filter((r, idx) => {
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

    let filteredComplaints = rawComplaints.filter((r, idx) => {
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
        let stars = parseInt(r[7]) || 2;
        if (stars >= 1 && stars <= 5) {
            starsCount[stars]++;
            totalStarsSum += stars;
            totalRatedItems++;
        }
    });

    if (selectedStarFilter !== null) {
        filteredLogs = filteredLogs.filter((r, idx) => {
            if (idx === 0) return true;
            let stars = parseInt(r[6]) || extractStarsFromDetails(r[3]) || 0;
            return stars === selectedStarFilter;
        });

        filteredComplaints = filteredComplaints.filter((r, idx) => {
            if (idx === 0) return true;
            let stars = parseInt(r[7]) || 2;
            return stars === selectedStarFilter;
        });
    }

    const totalScans = Math.max(0, filteredLogs.length - 1);
    const positiveCount = filteredLogs.filter(r => r[1] && String(r[1]).includes("إيجابي")).length;
    const complaintsCount = Math.max(0, filteredComplaints.length - 1);
    const avgStars = totalRatedItems > 0 ? (totalStarsSum / totalRatedItems).toFixed(1) : "0.0";

    document.getElementById('total-scans').innerText = totalScans;
    document.getElementById('total-positive').innerText = positiveCount;
    document.getElementById('total-complaints').innerText = complaintsCount;
    document.getElementById('avg-stars').innerText = `${avgStars} ⭐`;

    renderStarsChart(starsCount);
    renderMasterTable(filteredLogs, filteredComplaints);
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

// دمج الجدولين في جدول موحد واحد
function renderMasterTable(logs, complaints) {
    const tbody = document.getElementById('master-table-body');
    tbody.innerHTML = "";

    let combinedRows = [];

    // معالجة بيانات اللوغ
    for (let i = 1; i < logs.length; i++) {
        const r = logs[i];
        const isPositive = r[1] && String(r[1]).includes("إيجابي");
        combinedRows.push({
            date: r[0] ? new Date(r[0]) : new Date(0),
            dateStr: r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-',
            type: r[1] || 'نشاط',
            badgeClass: isPositive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
            stars: r[6] || extractStarsFromDetails(r[3]) || (isPositive ? 5 : 3),
            clientName: '-',
            phone: '-',
            employee: r[2] || 'عام',
            ip: r[7] || '0.0.0.0',
            deviceId: r[4] || 'N/A',
            details: r[3] || '-'
        });
    }

    // معالجة بيانات الشكاوى
    for (let i = 1; i < complaints.length; i++) {
        const r = complaints[i];
        const starsNum = r[7] || 2;
        combinedRows.push({
            date: r[0] ? new Date(r[0]) : new Date(0),
            dateStr: r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-',
            type: '🚨 شكوى داخلية',
            badgeClass: "bg-rose-100 text-rose-800 font-bold",
            stars: starsNum,
            clientName: r[1] || 'غير محدد',
            phone: r[2] || '-',
            employee: r[3] || 'عام',
            ip: r[8] || '0.0.0.0',
            deviceId: r[5] || 'N/A',
            details: r[4] || '-'
        });
    }

    // ترتيب السجلات تنازلياً حسب التاريخ الأحدث
    combinedRows.sort((a, b) => b.date - a.date);

    if (combinedRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-slate-400">لا توجد بيانات مسجلة مطابقة للفلتر.</td></tr>`;
        return;
    }

    combinedRows.forEach(row => {
        const starVisual = "⭐".repeat(row.stars);
        const phoneLink = row.phone !== '-' ? `<a href="tel:${row.phone}" class="text-blue-600 underline font-bold">${row.phone}</a>` : '-';

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-3.5 font-mono text-slate-400">${row.dateStr}</td>
                <td class="p-3.5"><span class="px-2.5 py-1 rounded-lg text-[11px] font-bold ${row.badgeClass}">${row.type}</span></td>
                <td class="p-3.5 font-bold">${starVisual} (${row.stars}/5)</td>
                <td class="p-3.5 font-bold text-slate-800">${row.clientName}</td>
                <td class="p-3.5">${phoneLink}</td>
                <td class="p-3.5 text-blue-600 font-medium">${row.employee}</td>
                <td class="p-3.5 font-mono text-slate-600">${row.ip}</td>
                <td class="p-3.5 font-mono text-purple-600">${row.deviceId}</td>
                <td class="p-3.5 text-slate-800 font-semibold leading-relaxed">${row.details}</td>
            </tr>
        `;
    });
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
                data: [starsData[1], starsData[2], starsData[3], starsData[4], starsData[5]],
                backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#14b8a6', '#10b981'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            onClick: (e, activeElements) => {
                if (activeElements.length > 0) {
                    const clickedIndex = activeElements[0].index;
                    const starClicked = clickedIndex + 1;
                    
                    selectedStarFilter = starClicked;
                    document.getElementById('star-filter-val').innerText = starClicked;
                    document.getElementById('active-star-badge').classList.remove('hidden');
                    document.getElementById('reset-star-filter').classList.remove('hidden');

                    applyFiltersAndRender();
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Date,Type,Stars,Client Name,Phone,Employee,IP Address,Device ID,Details\n";

    const rawLogs = globalData.logs || [];
    for (let i = 1; i < rawLogs.length; i++) {
        const r = rawLogs[i];
        csvContent += `"${r[0]}","${r[1]}","${r[6] || ''}","-","-","${r[2]}","${r[7] || ''}","${r[4] || ''}","${r[3]}"\n`;
    }

    const rawComp = globalData.complaints || [];
    for (let i = 1; i < rawComp.length; i++) {
        const r = rawComp[i];
        csvContent += `"${r[0]}","Complaint","${r[7] || 2}","${r[1]}","${r[2]}","${r[3]}","${r[8] || ''}","${r[5] || ''}","${r[4]}"\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Unified_Reviews_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function makeColumnsResizable() {
    document.querySelectorAll('.resizable-table').forEach(table => {
        table.querySelectorAll('th').forEach(col => {
            const resizer = col.querySelector('.resizer');
            if (!resizer) return;

            let x = 0, w = 0;
            resizer.addEventListener('mousedown', function (e) {
                x = e.clientX;
                w = parseInt(window.getComputedStyle(col).width, 10);

                const mouseMoveHandler = (e) => col.style.width = `${w - (e.clientX - x)}px`;
                const mouseUpHandler = () => {
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                };

                document.addEventListener('mousemove', mouseMoveHandler);
                document.addEventListener('mouseup', mouseUpHandler);
            });
        });
    });
}

function filterTables() {
    const q = document.getElementById('search-input').value.toLowerCase();
    document.querySelectorAll('#master-table-body tr').forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

setInterval(loadData, 30000);
loadData();
