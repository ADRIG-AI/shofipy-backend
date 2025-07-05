import Stripe from "stripe";
import 'dotenv/config';

// Note: Use `process.env` for server-side environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
});

export const createCheckoutSession = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        const { priceId, email } = req.body;

        if (!priceId || !email) {
            return res.status(400).json({ error: "Missing priceId or email" });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            customer_email: email,
            success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/billing`,
        });

        res.status(200).json({ url: session.url });
    } catch (error) {
        console.error("Error creating Stripe session:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
