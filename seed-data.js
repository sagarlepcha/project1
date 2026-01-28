/**
 * Seed Data Script - Restore Original Data
 * Repopulates the database with the original products, categories, and users
 * Run: node seed-data.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const { Category } = require('./models/category');
const { Product } = require('./models/product');
const { User } = require('./models/user');
const SystemSettings = require('./models/system-settings');

// Database connection
const connectionString = process.env.CONNECTION_STRING;

async function seedDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false,
            dbName: 'eshop-database'
        });
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('\n🧹 Clearing existing data...');
        await Category.deleteMany({});
        await Product.deleteMany({});
        console.log('✅ Existing products and categories cleared');

        // ==================== CATEGORIES (Original IDs) ====================
        console.log('\n📁 Creating categories...');

        // Create categories with the original IDs from your data
        const categories = [
            {
                _id: mongoose.Types.ObjectId('68f4168e27f42985eaa184e1'),
                name: 'Male Adapters',
                icon: 'construct-outline',
                color: '#4A90D9'
            },
            {
                _id: mongoose.Types.ObjectId('68f4166f27f42985eaa184df'),
                name: 'Double Seal Fittings',
                icon: 'git-merge-outline',
                color: '#7B68EE'
            },
            {
                _id: mongoose.Types.ObjectId('68f4156f27f42985eaa184d3'),
                name: 'PE-100 Pipes',
                icon: 'disc-outline',
                color: '#20B2AA'
            },
            {
                _id: mongoose.Types.ObjectId('5f15d5b7cb4a6642bddc0fe8'),
                name: 'Garden & Outdoor',
                icon: 'leaf-outline',
                color: '#32CD32'
            },
            {
                _id: mongoose.Types.ObjectId('5f15d5b2cb4a6642bddc0fe7'),
                name: 'Furniture',
                icon: 'bed-outline',
                color: '#DEB887'
            }
        ];

        for (const cat of categories) {
            await Category.create(cat);
        }
        console.log(`✅ Created ${categories.length} categories`);

        // ==================== PRODUCTS (Original Data) ====================
        console.log('\n📦 Creating products...');

        const products = [
            {
                _id: mongoose.Types.ObjectId('68f4168e27f42985eaa184e0'),
                name: 'Male Adapter SDR-11',
                description: 'Male Adapter SDR-11 for various sizes of Dn',
                richDescription:
                    'High-quality male adapter with SDR-11 rating for durable pipe connections',
                image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXogS68Zvt2Kbv6Q9Lxh4t_fmb3j95Ujed3w&s',
                images: [
                    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXogS68Zvt2Kbv6Q9Lxh4t_fmb3j95Ujed3w&s'
                ],
                brand: 'Gumar',
                category: mongoose.Types.ObjectId('68f4168e27f42985eaa184e1'),
                inStock: 'In Stock',
                dimension: 'length',
                features: [
                    { name: 'Dn', value: '63', price: 120, stock: 30 },
                    { name: 'Dn', value: '75', price: 140, stock: 25 },
                    { name: 'Dn', value: '90', price: 160, stock: 20 },
                    { name: 'Dn', value: '110', price: 190, stock: 15 }
                ]
            },
            {
                _id: mongoose.Types.ObjectId('68f4166f27f42985eaa184de'),
                name: 'Double Seal Elbow 90°',
                description: 'Double Seal Elbow 90° for various sizes of Dn.',
                richDescription:
                    'Premium double seal elbow with 90-degree angle for secure pipe connections',
                image: 'https://m.media-amazon.com/images/I/610tBz72-SL._UF894,1000_QL80_.jpg',
                images: ['https://m.media-amazon.com/images/I/610tBz72-SL._UF894,1000_QL80_.jpg'],
                brand: 'Double Seal',
                category: mongoose.Types.ObjectId('68f4166f27f42985eaa184df'),
                inStock: 'In Stock',
                dimension: 'length',
                features: [
                    { name: 'Dn', value: '50', price: 160, stock: 25 },
                    { name: 'Dn', value: '63', price: 180, stock: 22 },
                    { name: 'Dn', value: '75', price: 210, stock: 18 },
                    { name: 'Dn', value: '90', price: 240, stock: 12 },
                    { name: 'Dn', value: '110', price: 280, stock: 10 },
                    { name: 'Dn', value: '160', price: 350, stock: 8 },
                    { name: 'Dn', value: '200', price: 400, stock: 5 },
                    { name: 'Dn', value: '250', price: 450, stock: 4 },
                    { name: 'Dn', value: '315', price: 500, stock: 3 }
                ]
            },
            {
                _id: mongoose.Types.ObjectId('68f4156f27f42985eaa184d2'),
                name: 'PE-100 Pipe (IS 4984:2016)',
                description: 'High-density polyethylene pipe PE-100 as per IS 4984:2016 standard',
                richDescription:
                    'Premium PE-100 pipes manufactured according to IS 4984:2016 standards for high-pressure applications',
                image: 'https://www.viadux.com.au/sites/default/files/2024-09/PE100%20Hero%20Image.png',
                images: [
                    'https://www.viadux.com.au/sites/default/files/2024-09/PE100%20Hero%20Image.png'
                ],
                brand: 'PE-100',
                category: mongoose.Types.ObjectId('68f4156f27f42985eaa184d3'),
                inStock: 'In Stock',
                dimension: 'length',
                features: [
                    { name: 'Size Inch', value: '3/4″', price: 45, stock: 40 },
                    { name: 'Size Inch', value: '1″', price: 65, stock: 35 },
                    { name: 'Size Inch', value: '1¼″', price: 85, stock: 30 },
                    { name: 'Size Inch', value: '1½″', price: 110, stock: 25 },
                    { name: 'Size Inch', value: '2″', price: 140, stock: 20 }
                ]
            },
            {
                _id: mongoose.Types.ObjectId('68f4156f27f42985eaa184d4'),
                name: 'PE-100 Pipe (IS 4984:2016) - Series 2',
                description:
                    'High-density polyethylene pipe PE-100 as per IS 4984:2016 standard - Second series',
                richDescription:
                    'Premium PE-100 pipes manufactured according to IS 4984:2016 standards for high-pressure applications',
                image: 'https://www.viadux.com.au/sites/default/files/2024-09/PE100%20Hero%20Image.png',
                images: [
                    'https://www.viadux.com.au/sites/default/files/2024-09/PE100%20Hero%20Image.png'
                ],
                brand: 'PE-100',
                category: mongoose.Types.ObjectId('68f4156f27f42985eaa184d3'),
                inStock: 'In Stock',
                dimension: 'length',
                features: [
                    { name: 'Size Inch', value: '3/4″', price: 45, stock: 40 },
                    { name: 'Size Inch', value: '1″', price: 65, stock: 35 },
                    { name: 'Size Inch', value: '1¼″', price: 85, stock: 30 },
                    { name: 'Size Inch', value: '1½″', price: 110, stock: 25 },
                    { name: 'Size Inch', value: '2″', price: 140, stock: 20 }
                ]
            },
            {
                _id: mongoose.Types.ObjectId('68f4166f27f42985eaa184e0'),
                name: 'Double Seal Elbow 45°',
                description: 'Double Seal Elbow 45° for various sizes of Dn.',
                richDescription:
                    'Premium double seal elbow with 45-degree angle for smooth pipe direction changes',
                image: 'https://m.media-amazon.com/images/I/61L9bJBbseL.jpg',
                images: ['https://m.media-amazon.com/images/I/61L9bJBbseL.jpg'],
                brand: 'Double Seal',
                category: mongoose.Types.ObjectId('68f4166f27f42985eaa184df'),
                inStock: 'In Stock',
                dimension: 'length',
                features: [
                    { name: 'Dn', value: '50', price: 160, stock: 25 },
                    { name: 'Dn', value: '63', price: 180, stock: 22 },
                    { name: 'Dn', value: '75', price: 210, stock: 18 },
                    { name: 'Dn', value: '90', price: 240, stock: 12 },
                    { name: 'Dn', value: '110', price: 280, stock: 10 },
                    { name: 'Dn', value: '160', price: 350, stock: 8 },
                    { name: 'Dn', value: '200', price: 400, stock: 5 },
                    { name: 'Dn', value: '250', price: 450, stock: 4 },
                    { name: 'Dn', value: '315', price: 500, stock: 3 }
                ]
            },
            {
                _id: mongoose.Types.ObjectId('5f15d92ee520d44421ed8e9b'),
                name: 'Garden Chair',
                description: 'Beautiful chair for garden',
                richDescription: 'Comfortable and durable garden chair perfect for outdoor seating',
                image: 'https://www.kptpipes.com/images/products/product2.jpg',
                images: ['https://www.kptpipes.com/images/products/product2.jpg'],
                brand: 'IKEA',
                category: mongoose.Types.ObjectId('5f15d5b7cb4a6642bddc0fe8'),
                inStock: 'In Stock',
                dimension: 'quantity',
                features: [{ name: 'Standard', value: 'One Size', price: 350.9, stock: 10 }]
            },
            {
                _id: mongoose.Types.ObjectId('5f15d964e520d44421ed8e9c'),
                name: 'Swimming Pool',
                description: 'Beautiful Swimming Pool for garden',
                richDescription:
                    'Elegant swimming pool designed for backyard gardens and outdoor spaces',
                image: 'https://www.kptpipes.com/images/products/product2.jpg',
                images: ['https://www.kptpipes.com/images/products/product2.jpg'],
                brand: 'OBI',
                category: mongoose.Types.ObjectId('5f15d5b7cb4a6642bddc0fe8'),
                inStock: 'In Stock',
                dimension: 'quantity',
                features: [{ name: 'Standard', value: 'One Size', price: 1350.9, stock: 10 }]
            },
            {
                _id: mongoose.Types.ObjectId('5f15d9b3e520d44421ed8e9d'),
                name: 'Grass Cut Machine',
                description: 'Grass Cut Machine for garden',
                richDescription:
                    'Efficient grass cutting machine for maintaining beautiful garden lawns',
                image: 'https://5.imimg.com/data5/SELLER/Default/2022/11/GV/UY/CG/4034700/nikolas-cpvc-pipes-1000x1000.jpg',
                images: [
                    'https://5.imimg.com/data5/SELLER/Default/2022/11/GV/UY/CG/4034700/nikolas-cpvc-pipes-1000x1000.jpg'
                ],
                brand: 'OBI',
                category: mongoose.Types.ObjectId('5f15d5b7cb4a6642bddc0fe8'),
                inStock: 'In Stock',
                dimension: 'quantity',
                features: [{ name: 'Standard', value: 'One Size', price: 490.9, stock: 5 }]
            },
            {
                _id: mongoose.Types.ObjectId('5f15da13e520d44421ed8e9e'),
                name: 'Sofa',
                description: 'Big Sofa for living room',
                richDescription: 'Spacious and comfortable sofa perfect for living room seating',
                image: 'https://www.kptpipes.com/images/products/product4.jpg',
                images: ['https://www.kptpipes.com/images/products/product4.jpg'],
                brand: 'Mobilix',
                category: mongoose.Types.ObjectId('5f15d5b2cb4a6642bddc0fe7'),
                inStock: 'In Stock',
                dimension: 'quantity',
                features: [{ name: 'Standard', value: 'One Size', price: 1000, stock: 10 }]
            }
        ];

        for (const prod of products) {
            await Product.create(prod);
        }
        console.log(`✅ Created ${products.length} products`);

        // ==================== USERS ====================
        console.log('\n👤 Creating/Updating users...');

        const johnPassword = await bcrypt.hash('password123', 10);
        const adminPassword = await bcrypt.hash('admin123', 10);

        const john = await User.findOneAndUpdate(
            { email: 'john@example.com' },
            {
                name: 'John Doe',
                email: 'john@example.com',
                passwordHash: johnPassword,
                phone: '+1234567890',
                isAdmin: false,
                address: '123 Main St',
                dzongkhag: 'Thimphu',
                city: 'Thimphu',
                zip: '11001',
                country: 'Bhutan'
            },
            { upsert: true, new: true }
        );
        console.log(`✅ User: ${john.email} (ID: ${john._id})`);

        const admin = await User.findOneAndUpdate(
            { email: 'admin@example.com' },
            {
                name: 'Admin User',
                email: 'admin@example.com',
                passwordHash: adminPassword,
                phone: '+9876543210',
                isAdmin: true,
                address: 'Admin Building',
                dzongkhag: 'Thimphu',
                city: 'Thimphu',
                zip: '11001',
                country: 'Bhutan'
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Admin: ${admin.email} (ID: ${admin._id})`);

        // ==================== SYSTEM SETTINGS ====================
        console.log('\n⚙️ Creating/Updating system settings...');

        await SystemSettings.findOneAndUpdate(
            { setting_key: 'company_bank_account' },
            {
                setting_key: 'company_bank_account',
                setting_value: '100-234-567-890',
                description: 'Company bank account number for payment transfers',
                updated_at: new Date()
            },
            { upsert: true }
        );
        console.log('✅ Bank account setting configured');

        // ==================== SUMMARY ====================
        console.log('\n========================================');
        console.log('🎉 DATABASE RESTORED SUCCESSFULLY!');
        console.log('========================================');
        console.log(`📁 Categories: ${categories.length}`);
        console.log(`📦 Products: ${products.length}`);
        console.log('👤 Users: 2 (john@example.com, admin@example.com)');
        console.log('⚙️ System Settings: Bank account configured');
        console.log('\n📋 Login Credentials:');
        console.log('   User: john@example.com / password123');
        console.log('   Admin: admin@example.com / admin123');
        console.log('\n📦 Product IDs:');
        products.forEach((p) => {
            console.log(`   ${p.name}: ${p._id}`);
        });
        console.log('========================================\n');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the seed function
seedDatabase();
