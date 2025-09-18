-- Initialize databases for Chess Doubles development
CREATE DATABASE chess_doubles_test;

-- Grant permissions to postgres user
GRANT ALL PRIVILEGES ON DATABASE chess_doubles_dev TO postgres;
GRANT ALL PRIVILEGES ON DATABASE chess_doubles_test TO postgres;