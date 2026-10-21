const SCRIPT_API_URL = "https://script.google.com/macros/s/AKfycbx2hiiDXpkCTOqPE2-LQF7c0rd7bWDG7y4LJJ3ku8auC-LW0Wha2aET4vEXL6ZBopdZ/exec";

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

    let filteredLogs = rawLogs.filter((r, idx) => idx === 0 || isDateInPeriod(new Date(r[0]), activePeriod));
    let filteredComplaints = rawComplaints.filter((r, idx) => idx === 0 || isDateInPeriod(new Date(r[0]), activePeriod));

    let starsCount = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalStarsSum = 0;
    let totalRatedItems = 0;

    filteredLogs.slice(1).forEach(r => {
        let stars = parseInt(r[5]) || 0;
        if (stars >= 1 && stars <= 5) {
            starsCount[stars]++;
            totalStarsSum += stars;
            totalRatedItems++;
        }
    });

    filteredComplaints.slice(1).forEach(r => {
        let stars = parseInt(r[6]) || 2;
        if (stars >= 1 && stars <= 5) {
            starsCount[stars]++;
            totalStarsSum += stars;
            totalRatedItems++;
        }
    });

    if (selectedStarFilter !== null) {
        filteredLogs = filteredLogs.filter((r, idx) => idx === 0 || (parseInt(r[5]) || 0) === selectedStarFilter);
        filteredComplaints = filteredComplaints.filter((r, idx) => idx === 0 || (parseInt(r[6]) || 2) === selectedStarFilter);
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

function isDateInPeriod(dateObj, period) {
    if (!dateObj || isNaN(dateObj.getTime())) return true;
    const now = new Date();
    if (period === 'today') return dateObj.toDateString() === now.toDateString();
    if (period === 'week') return dateObj >= new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    if (period === 'month') return dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    return true;
}

function renderMasterTable(logs, complaints) {
    const tbody = document.getElementById('master-table-body');
    tbody.innerHTML = "";
    let combinedRows = [];

    // Logs structure expected: [Date, Action, Details, DeviceId, PhoneModel, Stars, IP, CouponRef, InputId]
    for (let i = 1; i < logs.length; i++) {
        const r = logs[i];
        const isPositive = r[1] && String(r[1]).includes("إيجابي");
        combinedRows.push({
            dateStr: r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-',
            type: r[1] || 'نشاط',
            badgeClass: isPositive ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
            stars: parseInt(r[5]) || (isPositive ? 5 : 3),
            couponRef: r[7] || '-',
            clientName: '-',
            phone: '-',
            ip: r[6] || '0.0.0.0',
            details: r[2] || '-'
        });
    }

    // Complaints structure expected: [Date, Name, Phone, Message, DeviceId, PhoneModel, Stars, IP, CouponRef, InputId]
    for (let i = 1; i < complaints.length; i++) {
        const r = complaints[i];
        combinedRows.push({
            dateStr: r[0] ? new Date(r[0]).toLocaleString('ar-AE') : '-',
            type: '🚨 شكوى داخلية',
            badgeClass: "bg-rose-100 text-rose-800 font-bold",
            stars: parseInt(r[6]) || 2,
            couponRef: r[8] || '-',
            clientName: r[1] || 'غير محدد',
            phone: r[2] || '-',
            ip: r[7] || '0.0.0.0',
            details: r[3] || '-'
        });
    }

    if (combinedRows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-400">لا توجد بيانات مسجلة.</td></tr>`;
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
                <td class="p-3.5 font-mono font-black text-blue-700 bg-blue-50/50">${row.couponRef}</td>
                <td class="p-3.5 font-bold text-slate-800">${row.clientName}</td>
                <td class="p-3.5">${phoneLink}</td>
                <td class="p-3.5 font-mono text-slate-600">${row.ip}</td>
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
            labels: ['1 نجمة', '2 نجوم', '3 نجوم', '4 نجوم', '5 نجوم'],
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
                    selectedStarFilter = activeElements[0].index + 1;
                    document.getElementById('star-filter-val').innerText = selectedStarFilter;
                    document.getElementById('active-star-badge').classList.remove('hidden');
                    document.getElementById('reset-star-filter').classList.remove('hidden');
                    applyFiltersAndRender();
                }
            },
            scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
        }
    });
}

function exportToCSV() {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Date,Type,Stars,Coupon Ref,Client Name,Phone,IP Address,Details\n";

    const rawLogs = globalData.logs || [];
    for (let i = 1; i < rawLogs.length; i++) {
        let r = rawLogs[i];
        csvContent += `"${r[0]}","${r[1]}","${r[5] || ''}","${r[7] || ''}","-","-","${r[6] || ''}","${r[2]}"\n`;
    }

    const rawComp = globalData.complaints || [];
    for (let i = 1; i < rawComp.length; i++) {
        let r = rawComp[i];
        csvContent += `"${r[0]}","Complaint","${r[6] || 2}","${r[8] || ''}","${r[1]}","${r[2]}","${r[7] || ''}","${r[3]}"\n`;
    }

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Reviews_Report_${new Date().toISOString().slice(0,10)}.csv`);
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
                const mm = (e) => col.style.width = `${w - (e.clientX - x)}px`;
                const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); };
                document.addEventListener('mousemove', mm);
                document.addEventListener('mouseup', mu);
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
