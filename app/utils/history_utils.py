from datetime import datetime

def format_history_entry(action, user_name, date=None):
    """
    Formatea una entrada de historial de manera consistente
    
    Args:
        action (str): Acción realizada (create, update, clone)
        user_name (str): Nombre del usuario
        date (datetime, optional): Fecha de la acción. Si es None, se usa la fecha actual.
    
    Returns:
        str: Entrada de historial formateada
    """
    if date is None:
        date = datetime.utcnow()
    
    if isinstance(date, datetime):
        date_str = date.strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        date_str = date
    
    # Normalizar el nombre de usuario (primera letra de cada palabra en mayúscula)
    user_name = ' '.join(word.capitalize() for word in user_name.split())
    
    # Normalizar la acción
    if action.lower() == "create":
        action = "Created by"
    elif action.lower() == "update":
        action = "Updated by"
    elif action.lower() == "clone":
        action = "Cloned by"
    
    return f"{action} {user_name} on {date_str}"

def get_creation_date_from_history(history):
    """
    Extrae la fecha de creación del historial
    
    Args:
        history (list): Lista de entradas de historial
    
    Returns:
        datetime: Fecha de creación o None si no se encuentra
    """
    if not history or not isinstance(history, list):
        return None
    
    # Buscar la primera entrada que contenga "created by" o "Created by"
    for entry in history:
        if isinstance(entry, str) and ("created by" in entry.lower()):
            # Extraer la fecha (asumiendo formato "... on YYYY-MM-DDTHH:MM:SSZ")
            parts = entry.split(" on ")
            if len(parts) > 1:
                try:
                    date_str = parts[-1].strip()
                    return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except:
                    pass
    return None

def get_last_update_from_history(history):
    """
    Extrae la fecha de última actualización del historial
    
    Args:
        history (list): Lista de entradas de historial
    
    Returns:
        datetime: Fecha de última actualización o None si no se encuentra
    """
    if not history or not isinstance(history, list):
        return None
    
    # La última entrada del historial debería ser la más reciente
    last_entry = history[-1]
    if isinstance(last_entry, str):
        # Extraer la fecha (asumiendo formato "... on YYYY-MM-DDTHH:MM:SSZ")
        parts = last_entry.split(" on ")
        if len(parts) > 1:
            try:
                date_str = parts[-1].strip()
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            except:
                pass
    return None

def extract_dates_from_history(history):
    """
    Extrae las fechas de creación y última actualización del historial
    
    Args:
        history (list): Lista de entradas de historial
    
    Returns:
        dict: Diccionario con las fechas de creación y última actualización
    """
    if not history or not isinstance(history, list) or len(history) == 0:
        return {
            'creation_date': None,
            'last_update': None
        }
    
    # La primera entrada debería ser la de creación
    creation_date = None
    for entry in history:
        if isinstance(entry, str) and ("created by" in entry.lower() or "cloned by" in entry.lower()):
            parts = entry.split(" on ")
            if len(parts) > 1:
                try:
                    date_str = parts[-1].strip()
                    # Si hay un paréntesis, eliminar todo lo que está después
                    if "(" in date_str:
                        date_str = date_str.split("(")[0].strip()
                    creation_date = date_str
                    break
                except:
                    pass
    
    # La última entrada debería ser la de última actualización
    last_update = None
    last_entry = history[-1]
    if isinstance(last_entry, str):
        parts = last_entry.split(" on ")
        if len(parts) > 1:
            try:
                date_str = parts[-1].strip()
                # Si hay un paréntesis, eliminar todo lo que está después
                if "(" in date_str:
                    date_str = date_str.split("(")[0].strip()
                last_update = date_str
            except:
                pass
    
    return {
        'creation_date': creation_date,
        'last_update': last_update
    }

def clean_redundant_history_fields(yaml_data):
    """
    Elimina campos redundantes relacionados con el historial
    
    Args:
        yaml_data (dict): Datos YAML del asistente
    
    Returns:
        dict: Datos YAML limpios
    """
    if not yaml_data or not isinstance(yaml_data, dict) or 'metadata' not in yaml_data:
        return yaml_data
    
    # Eliminar campos redundantes si existen
    if 'creation_date' in yaml_data['metadata']:
        del yaml_data['metadata']['creation_date']
    if 'last_update' in yaml_data['metadata']:
        del yaml_data['metadata']['last_update']
    
    return yaml_data
