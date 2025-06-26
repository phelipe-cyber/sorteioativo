-- Tabela para armazenar os usuários
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NULL DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar os produtos a serem sorteados
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_per_number DECIMAL(13, 2) NOT NULL,
    total_numbers INT NOT NULL DEFAULT 100,
    image_url VARCHAR(255),
    status ENUM('active', 'upcoming', 'drawn', 'cancelled') DEFAULT 'upcoming',
    prize_type ENUM('product_or_pix', 'product_only') NOT NULL DEFAULT 'product_or_pix',
    winning_number INT,
    winner_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (winner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabela para armazenar os pedidos (compras)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    final_total DECIMAL(10, 2) NOT NULL,
    prize_choice ENUM('pix', 'product') NULL DEFAULT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_details TEXT,
    pending_selected_numbers TEXT NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Tabela para armazenar todos os números de cada sorteio
CREATE TABLE raffle_numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT,
    reserved_at TIMESTAMP NULL DEFAULT NULL,
    order_id INT,
    number_value INT NOT NULL,
    status ENUM('available', 'reserved', 'sold') DEFAULT 'available',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    UNIQUE KEY unique_product_number (product_id, number_value)
);

-- Tabela de notificações
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_UNIQUE` (`token`),
  KEY `fk_password_reset_user_id_idx` (`user_id`),
  CONSTRAINT `fk_password_reset_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `system_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `level` VARCHAR(10) NOT NULL,
  `context` VARCHAR(50) NOT NULL,
  `message` TEXT NOT NULL,
  `payload` JSON NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` INT NULL DEFAULT NULL,
  `order_id` INT NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_log_user_id_idx` (`user_id` ASC),
  INDEX `fk_log_order_id_idx` (`order_id` ASC),
  CONSTRAINT `fk_log_user_id`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_log_order_id`
    FOREIGN KEY (`order_id`)
    REFERENCES `orders` (`id`)
    ON DELETE SET NULL
    ON UPDATE NO ACTION
);

ALTER TABLE `orders`
CHANGE COLUMN `total_amount` `final_total` DECIMAL(10,2) NULL DEFAULT NULL,
ADD COLUMN `subtotal` DECIMAL(10,2) NULL DEFAULT NULL AFTER `prize_choice`,
ADD COLUMN `discount_amount` DECIMAL(10,2) NULL DEFAULT NULL AFTER `subtotal`;

-- Adiciona colunas para a quantidade mínima e a percentagem do desconto.
ALTER TABLE `products` 
ADD COLUMN `discount_quantity` INT NULL DEFAULT NULL AFTER `prize_type`,
ADD COLUMN `discount_percentage` INT NULL DEFAULT NULL AFTER `discount_quantity`;

-- Adiciona um comentário para explicar as colunas
ALTER TABLE `products` 
COMMENT = 'discount_quantity: quantidade mínima de números para aplicar o desconto. discount_percentage: o valor da percentagem do desconto (ex: 10 para 10%).';
