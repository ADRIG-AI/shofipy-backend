import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
});

export const createCheckoutSession = async (req, res) => {
    try {
        const { priceId } = req.body;
        const { email } = req.user;
        
        if (!priceId) {
            return res.status(400).json({ error: "Missing priceId" });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            customer_email: email,
            success_url: `${req.headers.origin}/dashboard?success=true`,
            cancel_url: `${req.headers.origin}/billing`,
        });

        res.json({ url: session.url });
    } catch (error) {
        res.status(500).json({ error: "Checkout failed" });
    }
};
