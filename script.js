// Import Firebase directly from Google's CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeu0LgQ7Prqwh513A69etEjxdKHw2zHXQ",
  authDomain: "campasad-e9801.firebaseapp.com",
  databaseURL: "https://campasad-e9801-default-rtdb.firebaseio.com",
  projectId: "campasad-e9801",
  storageBucket: "campasad-e9801.firebasestorage.app",
  messagingSenderId: "375832127484",
  appId: "1:375832127484:web:db6afdc3c2df158379f479"
};

// Initialize Firebase App & Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
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
    let isActivelyBooking = false; // FIX: Flag to prevent the app from alerting you about your own booking!

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

    // Centralized LIVE Database Array
    let bookedSlots = [];

    // --- REALTIME FIREBASE SYNC ---
    const bookingsRef = ref(db, 'bookings');
    onValue(bookingsRef, (snapshot) => {
        const data = snapshot.val();
        bookedSlots = data ? Object.keys(data) : [];
        
        if (selectedScholar && selectedDate && !formStep.classList.contains('disabled')) {
             renderTimeSlots(true);
        } else if (selectedScholar && selectedDate) {
             renderTimeSlots();
        }
    });

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

    function renderTimeSlots(keepSelection = false) {
        timeGrid.innerHTML = ''; 
        baseSlots.forEach(slot => {
            const btn = document.createElement('button');
            btn.className = 'time-btn';
            btn.textContent = formatTime(slot);
            btn.dataset.time = slot;
            btn.type = "button";

            if (!isSlotAvailable(slot)) {
                btn.disabled = true;
                // FIX: Only trigger the boot-out alert if the user is NOT actively submitting the form
                if (selectedTime === slot && !isActivelyBooking) {
                    selectedTime = null;
                    formStep.classList.add('disabled');
                    alert("Someone just booked this slot! Please choose another time.");
                }
            } else {
                btn.addEventListener('click', handleTimeSelection);
                if (keepSelection && selectedTime === slot) {
                    btn.classList.add('selected');
                }
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
        
        if (!isSlotAvailable(selectedTime)) {
            alert("Sorry, this slot was just taken by someone else! Please choose another time.");
            selectedTime = null;
            formStep.classList.add('disabled');
            renderTimeSlots();
            return;
        }

        // Engage the active booking lock
        isActivelyBooking = true;
        
        submitBtn.textContent = "Booking...";
        submitBtn.disabled = true;
        
        const googleCalendarUrl = generateGCalLink(selectedScholar, selectedDate, selectedTime);
        const nameInput = document.getElementById('name').value;

        const attendeeData = {
            scholar: selectedScholar,
            date: selectedDate,
            time: formatTime(selectedTime), 
            name: nameInput,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            notes: document.getElementById('notes').value,
            gcal_link: googleCalendarUrl
        };

        emailjs.send("service_97zm0ea", "template_mh8tn4s", attendeeData)
            .then(function(response) {
                console.log('Email Sent!', response.status, response.text);
                finalizeBookingToFirebase(nameInput);
            }, function(error) {
                console.log('Email Failed...', error);
                alert("There was an issue sending the confirmation email, but we are locking in your spot.");
                finalizeBookingToFirebase(nameInput);
            });

        function finalizeBookingToFirebase(attendeeName) {
            const bookingKey = `${selectedScholar}_${selectedDate}_${selectedTime}`;
            
            set(ref(db, 'bookings/' + bookingKey), {
                bookedBy: attendeeName,
                timestamp: new Date().toISOString()
            }).then(() => {
                // Disengage lock and clear selection BEFORE firing the modal
                isActivelyBooking = false; 
                selectedTime = null;

                openModal(successModal);
                bookingForm.reset();
                submitBtn.textContent = "Confirm Booking";
                submitBtn.disabled = false;
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
                formStep.classList.add('disabled');
            }).catch((error) => {
                console.error("Firebase write failed: ", error);
                alert("Critical error saving to database. Please notify an organizer.");
                isActivelyBooking = false;
                submitBtn.textContent = "Confirm Booking";
                submitBtn.disabled = false;
            });
        }
    });
});
