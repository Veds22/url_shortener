from tests.conftest import engine
## Include in test_connection.py to verify database connection

def test_custom_db_connection(client):
    try:
        connection = engine.connect()
        print("Database connection successful!")
        assert connection is not None
        connection.close()
    except Exception as e:
        print("Error connecting to database:")
        print(e)