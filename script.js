document.addEventListener("DOMContentLoaded", async function() {
    const db = window.db;
    const chassisCollection = window.collection(db, 'chassis-tracking');

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

        await saveChassis({ account, chassis_number: chassisNumber, status, comments });
        document.getElementById('chassis-popup').style.display = 'none';
    });

    async function saveChassis(data) {
        try {
            await window.addDoc(chassisCollection, data);
            console.log('Chassis data saved:', data);
            loadChassis();
        } catch (error) {
            console.error('Error saving chassis data:', error);
        }
    }

    async function loadChassis() {
        try {
            const querySnapshot = await window.getDocs(chassisCollection);
            const tbody = document.getElementById('chassis-table').getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const row = doc.data();
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.account}</td>
                    <td>${row.chassis_number}</td>
                    <td>${row.status}</td>
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

    async function updateChassis(id) {
        const newStatus = prompt('Enter new status:');
        const newComments = prompt('Enter new comments:');
        if (newStatus !== null && newComments !== null) {
            try {
                const chassisDoc = window.doc(db, 'chassis-tracking', id);
                await window.updateDoc(chassisDoc, {
                    status: newStatus,
                    comments: newComments
                });
                console.log('Chassis data updated');
                loadChassis();
            } catch (error) {
                console.error('Error updating chassis data:', error);
            }
        }
    }

    async function deleteChassis(id) {
        try {
            const chassisDoc = window.doc(db, 'chassis-tracking', id);
            await window.deleteDoc(chassisDoc);
            console.log('Chassis data deleted');
            loadChassis();
        } catch (error) {
            console.error('Error deleting chassis data:', error);
        }
    }

    loadChassis();
});
