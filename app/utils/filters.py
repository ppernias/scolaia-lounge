from datetime import datetime

def datetime_filter(value):
    if not value:
        return ""
    try:
        if isinstance(value, str):
            dt = datetime.fromisoformat(value)
        else:
            dt = value
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception as e:
        return str(value)

def shortdate_filter(value):
    if not value:
        return ""
    try:
        if isinstance(value, str):
            dt = datetime.fromisoformat(value)
        else:
            dt = value
        return dt.strftime("%d-%m-%Y")
    except:
        return str(value)