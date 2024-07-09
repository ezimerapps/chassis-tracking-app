import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async function() {
    const db = window.db;
    const chassisCollection = collection(db, 'chassis-tracking');
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
            created_at: serverTimestamp(),  // Save server timestamp
            rtat_start: serverTimestamp()  // Start RTAT from now
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

    function calculateDaysSince(date) {
        const now = new Date();
        const startDate = date.toDate();
        const diffTime = Math.abs(now - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
    }

    function calculateRTAT(rtatStart, goDate) {
        if (!rtatStart || !goDate) return 'N/A';
        const endDate = goDate.toDate();
        const startDate = rtatStart.toDate();
        const diffTime = Math.abs(endDate - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
    }

    function getStatusStyle(daysInStatus) {
        if (daysInStatus <= 3) {
            return { backgroundColor: 'yellow', color: 'black', fontWeight: 'bold' };
        } else {
            return { backgroundColor: 'red', color: 'white', fontWeight: 'bold' };
        }
    }

    function getStatusWithDays(status, daysInStatus) {
        const dayText = daysInStatus === 1 ? 'Day' : 'Days';
        return `${status} for ${daysInStatus} ${dayText}`;
    }

    function getRTATText(rtat) {
        if (rtat === 'N/A') return rtat;
        const dayText = rtat === 1 ? 'Day' : 'Days';
        return `${rtat} ${dayText}`;
    }

    async function loadChassis() {
        try {
            const querySnapshot = await getDocs(chassisCollection);
            chassisData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            displayChassis(chassisData);
            updateSummaryTable(chassisData);
        } catch (error) {
            console.error('Error loading chassis data:', error);
        }
    }

    function displayChassis(data) {
        const tbody = document.getElementById('chassis-table').getElementsByTagName('tbody')[0];
        tbody.innerHTML = '';
        data.forEach((row) => {
            const daysInStatus = row.rtat_start ? calculateDaysSince(row.rtat_start) : 'N/A';
            const statusText = getStatusWithDays(row.status, daysInStatus);
            const style = getStatusStyle(daysInStatus);
            const rtat = row.status === 'GO' ? calculateRTAT(row.rtat_start, row.created_at) : daysInStatus;
            const rtatText = (rtat !== 'N/A') ? getRTATText(rtat) : rtat;
            const tr = document.createElement('tr');
            tr.setAttribute('data-id', row.id);
            const encodedComments = encodeURIComponent(row.comments || '');
            tr.innerHTML = `
                <td>${row.account}</td>
                <td>${row.chassis_number}</td>
                <td style="background-color:${style.backgroundColor}; color:${style.color}; font-weight:${style.fontWeight}">${statusText}</td>
                <td>${row.comments ? `<button onclick="viewComments('${row.id}', '${encodedComments}')">View Comments</button>` : 'No Comments'}</td>
                <td>${rtatText}</td>
                <td>
                    <button onclick="enableEdit('${row.id}')">Update</button>
                    <button onclick="deleteChassis('${row.id}')">Delete</button>
                    <button class="save-button" onclick="saveEdit('${row.id}')" style="display:none">Save</button>
                    <button onclick="cancelEdit('${row.id}')" style="display:none">Close</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updateSummaryTable(data) {
        const summary = {};

        // Initialize summary object
        data.forEach(row => {
            if (!summary[row.account]) {
                summary[row.account] = {
                    AE: 0,
                    AA: 0,
                    AR: 0,
                    UR: 0,
                    GO: 0
                };
            }

            // Log status for debugging
            console.log(`Processing status: ${row.status} for account: ${row.account}`);

            // Ensure status value matches exactly
            const status = row.status;
            if (status === 'AE' || status === 'AA' || status === 'AR' || status === 'UR' || status === 'GO') {
                summary[row.account][status]++;
            } else {
                console.warn(`Unexpected status: ${status}`);
            }
        });

        // Generate table rows
        const tbody = document.getElementById('summary-table').getElementsByTagName('tbody')[0];
        tbody.innerHTML = '';
        for (const account in summary) {
            const row = summary[account];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${account}</td>
                <td>${row.AE}</td>
                <td>${row.AA}</td>
                <td>${row.AR}</td>
                <td>${row.UR}</td>
                <td>${row.GO}</td>
            `;
            tbody.appendChild(tr);
        }
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
        const deleteButton = tr.querySelector('button[onclick^="deleteChassis"]');
        const saveButton = tr.querySelector('button.save-button');
        const closeButton = tr.querySelector('button[onclick^="cancelEdit"]');
        
        // Get current values
        const currentStatus = statusCell.innerText.split(' for ')[0];
        const currentComments = commentsCell.innerText;
        
        // Change status cell to dropdown
        statusCell.innerHTML = `
            <select id="status-select">
                <option value="AE" ${currentStatus === 'AE' ? 'selected' : ''}>Awaiting Estimate</option>
                <option value="AA" ${currentStatus === 'AA' ? 'selected' : ''}>Awaiting Approval</option>
                <option value="AR" ${currentStatus === 'AR' ? 'selected' : ''}>Awaiting Repair</option>
                <option value="UR" ${currentStatus === 'UR' ? 'selected' : ''}>Under Repair</option>
                <option value="GO" ${currentStatus === 'GO' ? 'selected' : ''}>Repairs Completed</option>
            </select>
        `;

        // Change comments cell to textarea
        commentsCell.innerHTML = `<textarea id="comments-textarea">${currentComments}</textarea>`;
        
        // Hide update and delete buttons, show save and close buttons
        updateButton.style.display = 'none';
        deleteButton.style.display = 'none';
        saveButton.style.display = 'inline';
        closeButton.style.display = 'inline';
    }

    window.saveEdit = async function(id) {
        const tr = document.querySelector(`tr[data-id="${id}"]`);
        const statusSelect = tr.querySelector('#status-select');
        const commentsTextarea = tr.querySelector('#comments-textarea');
        const updateButton = tr.querySelector('button[onclick^="enableEdit"]');
        const deleteButton = tr.querySelector('button[onclick^="deleteChassis"]');
        const saveButton = tr.querySelector('button.save-button');
        const closeButton = tr.querySelector('button[onclick^="cancelEdit"]');

        const newStatus = statusSelect.value;
        const newComments = commentsTextarea.value;
        
        try {
            const chassisDoc = doc(db, 'chassis-tracking', id);
            const updateData = {
                status: newStatus,
                comments: newComments,
                rtat_start: serverTimestamp() // Reset the RTAT start timestamp
            };

            // Stop RTAT when status changes to "GO"
            if (newStatus === 'GO') {
                updateData.rtat_start = null;
                updateData.created_at = serverTimestamp();
            }

            await updateDoc(chassisDoc, updateData);
            console.log('Chassis data updated');
            loadChassis();
        } catch (error) {
            console.error('Error updating chassis data:', error);
        }

        // Hide save and close buttons, show update and delete buttons
        updateButton.style.display = 'inline';
        deleteButton.style.display = 'inline';
        saveButton.style.display = 'none';
        closeButton.style.display = 'none';
    }

    window.cancelEdit = function(id) {
        loadChassis();
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
