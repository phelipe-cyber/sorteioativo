-- Tabela para armazenar os usuários
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar os produtos a serem sorteados
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_number DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    status ENUM('active', 'upcoming', 'drawn', 'cancelled') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar os pedidos (compras)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_details TEXT, -- Pode armazenar dados do QR Code ou ID da transação
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabela para armazenar todos os números de cada sorteio (o coração do sistema)
CREATE TABLE raffle_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT, -- Nulo se estiver disponível
    reserved_at TIMESTAMP NULL DEFAULT NULL,
    order_id INT, -- Nulo se não foi vendido
    number_value INT NOT NULL,
    status ENUM('available', 'reserved', 'sold') DEFAULT 'available',
    
    -- Chaves estrangeiras para garantir a integridade dos dados
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    
    -- Garante que um número não pode ser repetido para o mesmo produto
    UNIQUE KEY unique_product_number (product_id, number_value)
);

ALTER TABLE users
ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER password_hash;

-- Substitua 'seu_email@example.com' pelo email do usuário que será o admin
UPDATE users SET role = 'admin' WHERE email = 'seu_email@example.com';

ALTER TABLE products
ADD COLUMN winning_number INT,
ADD COLUMN winner_user_id INT,
ADD CONSTRAINT fk_winner_user FOREIGN KEY (winner_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE orders
ADD COLUMN product_id INT NOT NULL AFTER user_id,
ADD CONSTRAINT fk_order_product FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE products
MODIFY COLUMN price_per_number DECIMAL(13, 2) NOT NULL;

ALTER TABLE raffle_numbers
ADD COLUMN reserved_at TIMESTAMP NULL DEFAULT NULL AFTER order_id;

ALTER TABLE orders
ADD COLUMN pending_selected_numbers TEXT NULL DEFAULT NULL AFTER payment_details;

ALTER TABLE users
ADD COLUMN phone VARCHAR(20) NULL DEFAULT NULL AFTER email;

ALTER TABLE products
ADD COLUMN prize_type ENUM('product_or_pix', 'product_only') NOT NULL DEFAULT 'product_or_pix' AFTER total_numbers;

ALTER TABLE products
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;