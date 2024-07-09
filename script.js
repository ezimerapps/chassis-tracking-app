document.addEventListener("DOMContentLoaded", async function() {
    const db = window.db;
    const chassisCollection = window.collection(db, 'chassis-tracking');
    let chassisData = [];
    let currentSortColumn = null;

    // Add event listeners for new add chassis buttons
    document.getElementById('add-chassis-button-desktop').addEventListener('click', function () {
        document.getElementById('chassis-popup').style.display = 'flex';
    });

    document.getElementById('add-chassis-button-mobile').addEventListener('click', function () {
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
            created_at: window.serverTimestamp(),  // Save server timestamp
            rtat_start: status === 'Repairs Complete' ? null : window.serverTimestamp()  // Start RTAT if not complete
        };

        await saveChassis(data);
        document.getElementById('chassis-popup').style.display = 'none';
    });

    async function saveChassis(data) {
        try {
            console.log("Saving chassis data:", data);
            await window.addDoc(chassisCollection, data);
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
        const dayText = aging === 1 ? 'Day' : 'Days';
        return `${status} for ${aging} ${dayText}`;
    }

    async function loadChassis() {
        try {
            const querySnapshot = await window.getDocs(chassisCollection);
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
                    <button class="update-btn" onclick="enableEdit('${row.id}')">Update</button>
                    <button class="delete-btn" onclick="confirmDelete('${row.id}')">Delete</button>
                    <button class="save-btn" onclick="saveEdit('${row.id}')" style="display:none">Save</button>
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
        const updateButton = tr.querySelector('.update-btn');
        const saveButton = tr.querySelector('.save-btn');
        const deleteButton = tr.querySelector('.delete-btn');
        
        // Get current values
        const currentStatus = statusCell.innerText.split(' for ')[0];
        const currentComments = commentsCell.innerText;
        
        // Change status cell to dropdown
        statusCell.innerHTML = `
            <select id="status-select">
                <option value="AE" ${currentStatus === 'AE' ? 'selected' : ''}>Awaiting Estimate</option>
                <option value="AA" ${currentStatus === 'AA' ? 'selected' : ''}>Awaiting Approval</option>
                <option value="AR" ${currentStatus === 'AR' ? 'selected' : ''}>Awaiting Repair</option>
                <option value="Under Repair" ${currentStatus === 'Under Repair' ? 'selected' : ''}>Under Repair</option>
                <option value="Repairs Completed" ${currentStatus === 'Repairs Completed' ? 'selected' : ''}>Repairs Completed</option>
            </select>
        `;

        // Change comments cell to textarea
        commentsCell.innerHTML = `<textarea id="comments-textarea">${currentComments}</textarea>`;
        
        // Update button states
        updateButton.style.display = 'none';
        saveButton.style.display = 'inline';
        saveButton.style.backgroundColor = '#28a745'; // Green save button
        deleteButton.innerText = 'Close'; // Change Delete to Close
        deleteButton.classList.add('cancel-btn'); // Add a class to identify it as a cancel button
    }

    window.saveEdit = async function(id) {
        const tr = document.querySelector(`tr[data-id="${id}"]`);
        const statusSelect = tr.querySelector('#status-select');
        const commentsTextarea = tr.querySelector('#comments-textarea');
        const updateButton = tr.querySelector('.update-btn');
        const saveButton = tr.querySelector('.save-btn');
        const deleteButton = tr.querySelector('.delete-btn');

        const newStatus = statusSelect.value;
        const newComments = commentsTextarea.value;
        
        try {
            const chassisDoc = window.doc(db, 'chassis-tracking', id);
            const updateData = {
                status: newStatus,
                comments: newComments
            };

            // Update the timestamp to reset aging and start/end RTAT if applicable
            if (newStatus === 'Repairs Complete') {
                updateData.rtat_start = null;
            } else if (newStatus !== 'Awaiting Estimate') {
                updateData.rtat_start = window.serverTimestamp();
            }

            await window.updateDoc(chassisDoc, updateData);
            console.log('Chassis data updated');
            loadChassis();
        } catch (error) {
            console.error('Error updating chassis data:', error);
        }

        // Reset button states
        updateButton.style.display = 'inline';
        saveButton.style.display = 'none';
        deleteButton.innerText = 'Delete'; // Reset to Delete
        deleteButton.classList.remove('cancel-btn'); // Remove cancel button class
    }

    window.confirmDelete = function(id) {
        const deleteButton = document.querySelector(`tr[data-id="${id}"] .delete-btn`);
        if (deleteButton.classList.contains('confirm')) {
            deleteChassis(id);
        } else {
            deleteButton.innerHTML = '<i class="fa-solid fa-exclamation"></i>';
            deleteButton.classList.add('confirm');
            setTimeout(() => {
                deleteButton.innerText = 'Delete';
                deleteButton.classList.remove('confirm');
            }, 3000);
        }
    }

    window.deleteChassis = async function(id) {
        try {
            const chassisDoc = window.doc(db, 'chassis-tracking', id);
            await window.deleteDoc(chassisDoc);
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
