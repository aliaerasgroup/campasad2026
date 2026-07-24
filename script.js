document.addEventListener('DOMContentLoaded', () => {
    // --- SECRET TESTING RESET ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('reset')) {
        localStorage.removeItem('campAsadBookings');
        window.location.href = window.location.pathname; 
        return;
    }

    // --- Modal Logic ---
    const pdfModal = document.getElementById('pdf-modal');
    const openPdfBtn = document.getElementById('open-pdf-btn');
    const closePdfBtn = document.getElementById('close-pdf');

    const successModal = document.getElementById('success-modal');
    const closeSuccessBtn = document.getElementById('close-success');
    const successDoneBtn = document.getElementById('success-done-btn');

    function openModal(modalEl) {
        modalEl.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalEl) {
        modalEl.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    openPdfBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(pdfModal); });
    closePdfBtn.addEventListener('click', () => closeModal(pdfModal));
    
    closeSuccessBtn.addEventListener('click', () => closeModal(successModal));
    successDoneBtn.addEventListener('click', () => closeModal(successModal));

    window.addEventListener('click', (e) => {
        if (e.target === pdfModal) closeModal(pdfModal);
        if (e.target === successModal) closeModal(successModal);
    });

    // --- Helper to Generate Google Calendar URL ---
    function generateGCalLink(scholar, dateStr, time24Str) {
        const startDate = new Date(`${dateStr}T${time24Str}:00-04:00`);
        const startISO = startDate.toISOString().replace(/-|:|\.\d\d\d/g, "");

        const endDate = new Date(startDate.getTime() + 15 * 60000);
        const endISO = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");

        const title = encodeURIComponent(`Aalim Hours: ${scholar} - Camp Asad`);
        const details = encodeURIComponent(`Confidential 1-on-1 Aalim Hours session at Camp Asad 2026.\n\nPlease arrive on time to maximize your session.`);
        const location = encodeURIComponent(`Al Mahdi Islamic Community Centre, 510 Concession Road 3, Pickering ON`);

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}`;
    }

    // --- Booking Logic ---
    let selectedScholar = null;
    let selectedDate = '2026-09-05';
    let selectedTime = null;

    const scholarBtns = document.querySelectorAll('.scholar-btn');
    const dateBtns = document.querySelectorAll('.date-btn');
    const timeGrid = document.getElementById('time-slots');
    const datetimeStep = document.getElementById('datetime-step');
    const formStep = document.getElementById('form-step');
    const bookingForm = document.getElementById('booking-form');
    const tabSep7 = document.getElementById('tab-sep7');
    const tabSep5 = document.getElementById('tab-sep5');
    const submitBtn = document.getElementById('submit-booking-btn');

    const baseSlots = ["06:00", "06:15", "06:30", "06:45", "07:00", "07:15", "07:30", "07:45"];

    let bookedSlots = JSON.parse(localStorage.getItem('campAsadBookings')) || [];

    // 1. Scholar Selection
    scholarBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            scholarBtns.forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            selectedScholar = e.target.dataset.scholar;
            
            if (selectedScholar === "Shaykh Murtaza Bachoo") {
                tabSep7.style.display = 'none';
                if (selectedDate === '2026-09-07') {
                    tabSep5.click();
                }
            } else {
                tabSep7.style.display = 'inline-block';
            }

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
            
            renderTimeSlots();
            selectedTime = null; 
            formStep.classList.add('disabled');
        });
    });

    function isSlotAvailable(slotTimeStr) {
        const slotDateTime = new Date(`${selectedDate}T${slotTimeStr}:00-04:00`); 
        const now = new Date(); 
        
        const diffMs = slotDateTime - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 3) return false;

        const bookingKey = `${selectedScholar}_${selectedDate}_${slotTimeStr}`;
        if (bookedSlots.includes(bookingKey)) return false;

        return true;
    }

    function formatTime(time24) {
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    }

    function renderTimeSlots() {
        timeGrid.innerHTML = ''; 
        baseSlots.forEach(slot => {
            const btn = document.createElement('button');
            btn.className = 'time-btn';
            btn.textContent = formatTime(slot);
            btn.dataset.time = slot;
            btn.type = "button";

            if (!isSlotAvailable(slot)) {
                btn.disabled = true;
            } else {
                btn.addEventListener('click', handleTimeSelection);
            }
            timeGrid.appendChild(btn);
        });
    }

    function handleTimeSelection(e) {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedTime = e.target.dataset.time;
        
        formStep.classList.remove('disabled');
        formStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Handle Form Submission
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitBtn.textContent = "Booking...";
        submitBtn.disabled = true;
        
        // Generate Google Calendar Url
        const googleCalendarUrl = generateGCalLink(selectedScholar, selectedDate, selectedTime);

        const attendeeData = {
            scholar: selectedScholar,
            date: selectedDate,
            time: formatTime(selectedTime), 
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            notes: document.getElementById('notes').value,
            gcal_link: googleCalendarUrl
        };

        emailjs.send("service_97zm0ea", "template_mh8tn4s", attendeeData)
            .then(function(response) {
                console.log('SUCCESS!', response.status, response.text);
                finalizeBooking();
            }, function(error) {
                console.log('FAILED...', error);
                alert("There was an issue sending the confirmation email, but your spot is reserved.");
                finalizeBooking();
            });

        function finalizeBooking() {
            const bookingKey = `${selectedScholar}_${selectedDate}_${selectedTime}`;
            bookedSlots.push(bookingKey);
            localStorage.setItem('campAsadBookings', JSON.stringify(bookedSlots));

            openModal(successModal);
            
            bookingForm.reset();
            submitBtn.textContent = "Confirm Booking";
            submitBtn.disabled = false;
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
            formStep.classList.add('disabled');
            
            renderTimeSlots();
        }
    });
});
