import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function() {
    const db = window.db;
    const chassisCollection = collection(db, 'chassis-tracking');

    document.getElementById('add-chassis-button').addEventListener('click', function () {
        document.getElementById('chassis-popup').style.display = 'flex';
    });

    document.getElementById('close-popup').addEventListener('click', function () {
        document.getElementById('chassis-popup').style.display = 'none';
    });

    document.getElementById('chassis-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const account = document.getElementById('account').value;
        const chassisNumber = document.getElementById('chassis-number').value;
        const status = document.getElementById('status').value;
        const comments = document.getElementById('comments').value;

        const data = {
            account,
            chassis_number: chassisNumber,
            status,
            comments,
            created_at: serverTimestamp()  // Save server timestamp
        };

        await saveChassis(data);
        document.getElementById('chassis-popup').style.display = 'none';
    });

    async function saveChassis(data) {
        try {
            console.log("Saving chassis data:", data);
            await addDoc(chassisCollection, data);
            console.log('Chassis data saved:', data);
            loadChassis();
        } catch (error) {
            console.error('Error saving chassis data:', error);
        }
    }

    function calculateAging(createdAt) {
        const now = new Date();
        const createdDate = createdAt.toDate();
        const diffTime = Math.abs(now - createdDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
    }

    function getStatusColor(aging) {
        if (aging < 3) return 'green';
        if (aging < 5) return 'yellow';
        return 'red';
    }

    function getStatusWithAging(status, createdAt) {
        const aging = calculateAging(createdAt);
        return `${status} for ${aging} day(s)`;
    }

    async function loadChassis() {
        try {
            const querySnapshot = await getDocs(chassisCollection);
            const tbody = document.getElementById('chassis-table').getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const row = doc.data();
                const aging = row.created_at ? calculateAging(row.created_at) : 'N/A';
                const statusText = row.created_at ? getStatusWithAging(row.status, row.created_at) : row.status;
                const color = getStatusColor(aging);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.account}</td>
                    <td>${row.chassis_number}</td>
                    <td style="background-color:${color}">${statusText}</td>
                    <td>${row.comments}</td>
                    <td>
                        <button onclick="updateChassis('${doc.id}')">Update</button>
                        <button onclick="deleteChassis('${doc.id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error loading chassis data:', error);
        }
    }

    window.updateChassis = async function(id) {
        const newStatus = prompt('Enter new status:');
        const newComments = prompt('Enter new comments:');
        if (newStatus !== null && newComments !== null) {
            try {
                const chassisDoc = doc(db, 'chassis-tracking', id);
                await updateDoc(chassisDoc, {
                    status: newStatus,
                    comments: newComments
                });
                console.log('Chassis data updated');
                loadChassis();
            } catch (error) {
                console.error('Error updating chassis data:', error);
            }
        }
    };

    window.deleteChassis = async function(id) {
        try {
            const chassisDoc = doc(db, 'chassis-tracking', id);
            await deleteDoc(chassisDoc);
            console.log('Chassis data deleted');
            loadChassis();
        } catch (error) {
            console.error('Error deleting chassis data:', error);
        }
    };

    loadChassis();
});
