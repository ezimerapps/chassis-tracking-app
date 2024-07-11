import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function() {
    const db = window.db;
    const chassisArchiveCollection = collection(db, 'chassis-archive');
    let chassisData = [];

    async function loadArchivedChassis() {
        try {
            const querySnapshot = await getDocs(chassisArchiveCollection);
            chassisData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            displayArchivedChassis(chassisData);
        } catch (error) {
            console.error('Error loading archived chassis data:', error);
        }
    }

    function calculateRTAT(createdAt, rtatEnd) {
        const endDate = rtatEnd ? rtatEnd.toDate() : new Date();
        const startDate = createdAt.toDate();
        const diffTime = Math.abs(endDate.setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0));
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    function displayArchivedChassis(data) {
        const tbody = document.getElementById('archived-chassis-table').getElementsByTagName('tbody')[0];
        tbody.innerHTML = '';
        data.forEach((row) => {
            const rtat = row.created_at ? calculateRTAT(row.created_at, row.rtat_end) : 'N/A';
            const rtatText = rtat !== 'N/A' ? `${rtat} Days` : rtat;
            
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', row.id);
            tr.innerHTML = `
                <td>${row.account}</td>
                <td>${row.chassis_number}</td>
                <td>${row.status}</td>
                <td>${row.comments}</td>
                <td>${row.archived_at ? new Date(row.archived_at.seconds * 1000).toLocaleDateString() : ''}</td>
                <td>${rtatText}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    loadArchivedChassis();

    document.getElementById('home-button-desktop').addEventListener('click', function () {
        window.location.href = 'index.html';
    });

    document.getElementById('home-button-mobile').addEventListener('click', function () {
        window.location.href = 'index.html';
    });
});
