document.addEventListener('DOMContentLoaded', () => {
    // --- PDF Modal Logic ---
    const modal = document.getElementById('pdf-modal');
    const openPdfBtn = document.getElementById('open-pdf-btn');
    const closeBtn = document.querySelector('.close-btn');

    openPdfBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
        }
    });

    // --- Booking Tool Logic ---
    let selectedScholar = null;
    let selectedDate = '2026-09-05';
    let selectedTime = null;

    const scholarBtns = document.querySelectorAll('.scholar-btn');
    const dateBtns = document.querySelectorAll('.date-btn');
    const timeGrid = document.getElementById('time-slots');
    
    const datetimeStep = document.getElementById('datetime-step');
    const formStep = document.getElementById('form-step');
    const bookingForm = document.getElementById('booking-form');

    // Base slots: 6:00 AM to 8:00 AM in 15 min increments
    const baseSlots = [
        "06:00", "06:15", "06:30", "06:45",
        "07:00", "07:15", "07:30", "07:45"
    ];

    // Mock Database for already booked slots (Format: Scholar_Date_Time)
    const bookedSlots = [
        "Sayyid Ali Imran_2026-09-05_06:30",
        "Ustadha Zermina Awan_2026-09-06_07:15"
    ];

    // 1. Scholar Selection
    scholarBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            scholarBtns.forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedScholar = e.target.dataset.scholar;
            
            // Unlock next step
            datetimeStep.classList.remove('disabled');
            renderTimeSlots();
        });
    });

    // 2. Date Selection
    dateBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            dateBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            selectedDate = e.target.dataset.date;
            
            // Re-render slots for new date
            renderTimeSlots();
            selectedTime = null; // Reset time selection
            formStep.classList.add('disabled');
        });
    });

    // Function to check if slot is valid (3-hour rule & past rule)
    function isSlotAvailable(slotTimeStr) {
        // Parse the slot date and time
        const slotDateTime = new Date(`${selectedDate}T${slotTimeStr}:00-04:00`); 
        const now = new Date(); 
        
        // Calculate the difference in milliseconds
        const diffMs = slotDateTime - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        // Rule: Cannot book if day has passed OR less than 3 hours left
        if (diffHours < 3) {
            return false;
        }

        // Rule: Cannot book if already taken
        const bookingKey = `${selectedScholar}_${selectedDate}_${slotTimeStr}`;
        if (bookedSlots.includes(bookingKey)) {
            return false;
        }

        return true;
    }

    // Format 24h to 12h AM/PM for display
    function formatTime(time24) {
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    }

    // Render slots dynamically
    function renderTimeSlots() {
        timeGrid.innerHTML = ''; // Clear previous

        baseSlots.forEach(slot => {
            const btn = document.createElement('button');
            btn.className = 'time-btn';
            btn.textContent = formatTime(slot);
            btn.dataset.time = slot;

            if (!isSlotAvailable(slot)) {
                btn.disabled = true;
                btn.title = "Slot unavailable or too close to current time.";
            } else {
                btn.addEventListener('click', handleTimeSelection);
            }

            timeGrid.appendChild(btn);
        });
    }

    // Handle selecting a specific time
    function handleTimeSelection(e) {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedTime = e.target.dataset.time;
        
        // Unlock final step
        formStep.classList.remove('disabled');
        
        // Scroll to form smoothly
        formStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Handle Form Submission
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const attendeeData = {
            scholar: selectedScholar,
            date: selectedDate,
            time: selectedTime,
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            notes: document.getElementById('notes').value
        };

        console.log("Booking Payload:", attendeeData);
        alert(`Booking Confirmed!\n\nScholar: ${attendeeData.scholar}\nDate: ${attendeeData.date}\nTime: ${formatTime(attendeeData.time)}\n\nA confirmation email will be sent to ${attendeeData.email}.`);
        
        // Reset form
        bookingForm.reset();
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
        formStep.classList.add('disabled');
    });
});
