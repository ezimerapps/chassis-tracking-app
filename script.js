import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function() {
    const db = window.db;
    const chassisCollection = collection(db, 'chassis-tracking');
    let chassisData = [];
    let currentSortColumn = null;

    document.getElementById('add-chassis-button').addEventListener('click', function () {
        document.getElementById('chassis-popup').style.display = 'flex';
    });

    document.getElementById('close-popup').addEventListener('click', function () {
        document.getElementById('chassis-popup').style.display = 'none';
    });

    document.getElementById('close-comments-popup').addEventListener('click', function () {
        document.getElementById('comments-popup').style.display = 'none';
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
            created_at: serverTimestamp(),  // Save server timestamp
            rtat_start: status === 'Repairs Complete' ? null : serverTimestamp()  // Start RTAT if not complete
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

    function calculateRTAT(createdAt, rtatStart) {
        if (!rtatStart) return 'N/A';
        const now = new Date();
        const startDate = rtatStart.toDate();
        const diffTime = Math.abs(now - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
    }

    function getStatusStyle(aging) {
        if (aging < 3) {
            return { backgroundColor: 'yellow', color: 'black', fontWeight: 'bold' };
        } else if (aging < 5) {
            return { backgroundColor: 'red', color: 'white', fontWeight: 'bold' };
        } else {
            return { backgroundColor: 'red', color: 'white', fontWeight: 'bold' };
        }
    }

    function getStatusWithAging(status, createdAt) {
        const aging = calculateAging(createdAt);
        return `${status} for ${aging} day(s)`;
    }

    async function loadChassis() {
        try {
            const querySnapshot = await getDocs(chassisCollection);
            chassisData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            displayChassis(chassisData);
        } catch (error) {
            console.error('Error loading chassis data:', error);
        }
    }

    function displayChassis(data) {
        const tbody = document.getElementById('chassis-table').getElementsByTagName('tbody')[0];
        tbody.innerHTML = '';
        data.forEach((row) => {
            const aging = row.created_at ? calculateAging(row.created_at) : 'N/A';
            const statusText = row.created_at ? getStatusWithAging(row.status, row.created_at) : row.status;
            const style = getStatusStyle(aging);
            const rtat = row.status === 'Repairs Complete' ? calculateRTAT(row.created_at, row.rtat_start) : 'N/A';
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', row.id);
            const encodedComments = encodeURIComponent(row.comments || '');
            tr.innerHTML = `
                <td>${row.account}</td>
                <td>${row.chassis_number}</td>
                <td style="background-color:${style.backgroundColor}; color:${style.color}; font-weight:${style.fontWeight}">${statusText}</td>
                <td>${row.comments ? `<button onclick="viewComments('${row.id}', '${encodedComments}')">View Comments</button>` : 'No Comments'}</td>
                <td>${rtat}</td>
                <td>
                    <button onclick="enableEdit('${row.id}')">Update</button>
                    <button onclick="deleteChassis('${row.id}')">Delete</button>
                    <button onclick="saveEdit('${row.id}')" style="display:none">Save</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    window.viewComments = function(id, encodedComments) {
        const decodedComments = decodeURIComponent(encodedComments);
        document.getElementById('comments-content').innerText = decodedComments;
        document.getElementById('comments-popup').style.display = 'flex';
    }

    window.enableEdit = function(id) {
        const tr = document.querySelector(`tr[data-id="${id}"]`);
        const statusCell = tr.cells[2];
        const commentsCell = tr.cells[3];
        const updateButton = tr.querySelector('button[onclick^="enableEdit"]');
        const saveButton = tr.querySelector('button[onclick^="saveEdit"]');
        
        // Get current values
        const currentStatus = statusCell.innerText.split(' for ')[0];
        const currentComments = commentsCell.innerText;
        
        // Change status cell to dropdown
        statusCell.innerHTML = `
            <select id="status-select">
                <option value="Awaiting Estimate" ${currentStatus === 'Awaiting Estimate' ? 'selected' : ''}>Awaiting Estimate</option>
                <option value="Awaiting Approval" ${currentStatus === 'Awaiting Approval' ? 'selected' : ''}>Awaiting Approval</option>
                <option value="AP - Awaiting Repair" ${currentStatus === 'AP - Awaiting Repair' ? 'selected' : ''}>AP - Awaiting Repair</option>
                <option value="AP - Under Repair" ${currentStatus === 'AP - Under Repair' ? 'selected' : ''}>AP - Under Repair</option>
                <option value="Repairs Complete" ${currentStatus === 'Repairs Complete' ? 'selected' : ''}>Repairs Complete</option>
            </select>
        `;

        // Change comments cell to textarea
        commentsCell.innerHTML = `<textarea id="comments-textarea">${currentComments}</textarea>`;
        
        // Hide update button and show save button
        updateButton.style.display = 'none';
        saveButton.style.display = 'inline';
    }

    window.saveEdit = async function(id) {
        const tr = document.querySelector(`tr[data-id="${id}"]`);
        const statusSelect = tr.querySelector('#status-select');
        const commentsTextarea = tr.querySelector('#comments-textarea');
        const updateButton = tr.querySelector('button[onclick^="enableEdit"]');
        const saveButton = tr.querySelector('button[onclick^="saveEdit"]');

        const newStatus = statusSelect.value;
        const newComments = commentsTextarea.value;
        
        try {
            const chassisDoc = doc(db, 'chassis-tracking', id);
            const updateData = {
                status: newStatus,
                comments: newComments
            };

            // Update the timestamp to reset aging and start/end RTAT if applicable
            if (newStatus === 'Repairs Complete') {
                updateData.rtat_start = null;
            } else if (newStatus !== 'Awaiting Estimate') {
                updateData.rtat_start = serverTimestamp();
            }

            await updateDoc(chassisDoc, updateData);
            console.log('Chassis data updated');
            loadChassis();
        } catch (error) {
            console.error('Error updating chassis data:', error);
        }

        // Hide save button and show update button
        updateButton.style.display = 'inline';
        saveButton.style.display = 'none';
    }

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

    window.sortTable = function(sortBy) {
        chassisData.sort((a, b) => {
            if (a[sortBy] < b[sortBy]) return -1;
            if (a[sortBy] > b[sortBy]) return 1;
            return 0;
        });
        displayChassis(chassisData);
        highlightSortedColumn(sortBy);
    };

    function highlightSortedColumn(sortBy) {
        if (currentSortColumn) {
            document.querySelector(`th.sorting`).classList.remove('sorting');
        }
        const th = document.querySelector(`th[onclick="sortTable('${sortBy}')"]`);
        if (th) {
            th.classList.add('sorting');
            currentSortColumn = sortBy;
        }
    }

    loadChassis();
});
