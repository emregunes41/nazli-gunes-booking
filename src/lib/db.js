import { db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, getDoc } from "firebase/firestore";

// Helper function to create a new booking
export const createBooking = async (bookingData) => {
  try {
    const docRef = await addDoc(collection(db, "bookings"), bookingData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error creating booking: ", error);
    return { success: false, error: error.message };
  }
};

// We will also structure a function to check booked slots
// This is to prevent double booking.
