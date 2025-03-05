from typing import Dict
from sqlalchemy import inspect
from ..database.database import DB_PATH, init_db, engine, SessionLocal
from ..database.models import Setting, User

def check_configuration() -> Dict[str, bool]:
    """
    Check system configuration and database status
    Returns a dictionary with configuration status
    """
    config_status = {
        "database_found": False,
        "database_initialized": False
    }
    
    print("\n=== Checking System Configuration ===")
    
    # Check if database exists
    if DB_PATH.exists():
        print("✓ Database found!")
        config_status["database_found"] = True
    else:
        print("× Database not found - Will create new database")
    
    # Initialize database if needed
    try:
        init_db()
        config_status["database_initialized"] = True
        
        # Mostrar settings actuales
        db = SessionLocal()
        try:
            settings = db.query(Setting).all()
            if settings:
                print("\nCurrent Settings:")
                print("=" * 50)
                
                current_category = None
                for setting in settings:
                    try:
                        if current_category != setting.category:
                            current_category = setting.category
                            print(f"\n{current_category.upper()}:")
                        
                        # Manejar el valor con más cuidado
                        try:
                            value = setting.get_value() if setting.value else ''
                        except Exception:
                            value = '<error decrypting value>'
                        
                        encrypted_mark = "🔒" if setting.is_encrypted else " "
                        print(f"  {encrypted_mark} {setting.key}: {value}")
                    
                    except Exception as setting_error:
                        print(f"  Error processing setting {setting.key}: {str(setting_error)}")
                
                print("\n" + "=" * 50)
            else:
                print("\nNo settings found in database.")
                
        except Exception as e:
            print(f"Error querying settings: {str(e)}")
        finally:
            db.close()
            
    except Exception as e:
        print(f"Error initializing database: {str(e)}")
        
    return config_status

if __name__ == "__main__":
    check_configuration() 