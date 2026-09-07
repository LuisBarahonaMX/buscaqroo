import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";

function ProtectedRoute({ children, fallback = null }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user || !user.email) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "users"),
          where("email", "==", user.email)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        const data = snapshot.docs[0].data();

        setAllowed(data.role === "admin" && data.active === true);
      } catch (error) {
        console.error("Error validando acceso admin:", error);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Validando acceso...</div>;
  }

  return allowed ? children : fallback;
}

export default ProtectedRoute;