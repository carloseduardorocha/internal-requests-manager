-- Test database used by PHPUnit, next to the application database.
CREATE DATABASE IF NOT EXISTS `testing`;
GRANT ALL PRIVILEGES ON `testing`.* TO 'irm'@'%';
