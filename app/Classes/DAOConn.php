<?php
namespace App\Classes;
use PDO;
use PDOException;

class DAOConn
{
    private $host = "localhost";
    private $port = "3306";
    private $db_name = "db_gpexcelencia";
    private $username = "root";
    private $password = 'My$qL2039*#@';
    public $conn;

    // Obtener la conexión a la base de datos
    public function getConnection()
    {
        $this->conn = null;

        try {
            $this->conn = new PDO("mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name, $this->username, $this->password);
            $this->conn->exec("set names utf8");
        } catch (PDOException $exception) {
            echo "Error de conexión: " . $exception->getMessage();
        }

        return $this->conn;
    }
}