import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const getSupabaseClient = () => {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
};

// Helper function to hash password with SHA-256 (for old passwords)
const hashPasswordSHA256 = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

// Helper function to verify password (supports both old SHA-256 and new bcrypt)
const verifyPassword = async (password, storedHash) => {
    // Try bcrypt first (new format)
    if (storedHash.startsWith('$2')) {
        return await bcrypt.compare(password, storedHash);
    }
    
    // Fall back to SHA-256 (old format)
    const sha256Hash = hashPasswordSHA256(password);
    return sha256Hash === storedHash;
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const supabase = getSupabaseClient();
        
        const { data: user } = await supabase
            .from('users')
            .select('id, name, email, password_hash')
            .eq('email', email)
            .single();
            
        if (user && await verifyPassword(password, user.password_hash)) {
            const token = jwt.sign(
                { userId: user.id, email: user.email, type: 'admin', role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({ token, user: { id: user.id, name: user.name, email: user.email, type: 'admin', role: 'admin' } });
        }
        
        const { data: subUser } = await supabase
            .from('sub_users')
            .select('id, name, email, password_hash, role')
            .eq('email', email)
            .single();
            
        if (subUser && await verifyPassword(password, subUser.password_hash)) {
            const token = jwt.sign(
                { userId: subUser.id, email: subUser.email, type: 'sub_user', role: subUser.role },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({ token, user: { id: subUser.id, name: subUser.name, email: subUser.email, type: 'sub_user', role: subUser.role } });
        }
        
        res.status(401).json({ error: 'Invalid credentials' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

export const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const supabase = getSupabaseClient();
        
        const { data, error } = await supabase
            .from('users')
            .insert([{ name, email, password_hash: hashedPassword }])
            .select()
            .single();
            
        if (error) return res.status(400).json({ error: error.message });
        
        const token = jwt.sign(
            { userId: data.id, email: data.email, type: 'admin', role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ token, user: { id: data.id, name: data.name, email: data.email, type: 'admin', role: 'admin' } });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
};
