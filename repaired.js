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

    function displayArchivedChassis(data) {
        const tbody = document.getElementById('archived-chassis-table').getElementsByTagName('tbody')[0];
        tbody.innerHTML = '';
        data.forEach((row) => {
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', row.id);
            tr.innerHTML = `
                <td>${row.account}</td>
                <td>${row.chassis_number}</td>
                <td>${row.status}</td>
                <td>${row.comments}</td>
                <td>${row.archived_at ? new Date(row.archived_at.seconds * 1000).toLocaleDateString() : ''}</td>
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
