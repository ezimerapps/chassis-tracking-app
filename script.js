document.addEventListener("DOMContentLoaded", function() {
    const supabase = window.supabase;

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
        const { data: chassis, error } = await supabase
            .from('chassis-tracking')
            .insert([data]);

        if (error) {
            console.error('Error saving chassis data:', error);
        } else {
            console.log('Chassis data saved:', chassis);
            loadChassis();
        }
    }

    async function loadChassis() {
        const { data: chassis, error } = await supabase
            .from('chassis-tracking')
            .select('*');

        if (error) {
            console.error('Error loading chassis data:', error);
        } else {
            const tbody = document.getElementById('chassis-table').getElementsByTagName('tbody')[0];
            tbody.innerHTML = '';
            chassis.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.account}</td>
                    <td>${row.chassis_number}</td>
                    <td>${row.status}</td>
                    <td>${row.comments}</td>
                    <td>
                        <button onclick="updateChassis('${row.id}')">Update</button>
                        <button onclick="deleteChassis('${row.id}')">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    async function updateChassis(id) {
        const newStatus = prompt('Enter new status:');
        const newComments = prompt('Enter new comments:');
        if (newStatus && newComments !== null) {
            const { data, error } = await supabase
                .from('chassis-tracking')
                .update({ status: newStatus, comments: newComments })
                .eq('id', id);

            if (error) {
                console.error('Error updating chassis data:', error);
            } else {
                console.log('Chassis data updated:', data);
                loadChassis();
            }
        }
    }

    async function deleteChassis(id) {
        const { data, error } = await supabase
            .from('chassis-tracking')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting chassis data:', error);
        } else {
            console.log('Chassis data deleted:', data);
            loadChassis();
        }
    }

    // Test function to verify Supabase configuration
    async function testSupabase() {
        // Test inserting a row
        const { data: insertData, error: insertError } = await supabase
            .from('chassis-tracking')
            .insert([
                { account: 'Test Account', chassis_number: '12345', status: 'In Service', comments: 'Test Comment' }
            ]);

        if (insertError) {
            console.error('Error inserting data:', insertError);
        } else {
            console.log('Data inserted successfully:', insertData);
        }

        // Test fetching rows
        const { data: fetchData, error: fetchError } = await supabase
            .from('chassis-tracking')
            .select('*');

        if (fetchError) {
            console.error('Error fetching data:', fetchError);
        } else {
            console.log('Data fetched successfully:', fetchData);
        }
    }

    // Call the test function when the script loads
    testSupabase();

    loadChassis();
});