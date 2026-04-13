import json
from sqlalchemy import TypeDecorator, TEXT
from sqlalchemy.dialects import postgresql

class CompatibleARRAY(TypeDecorator):
    """
    Custom type for cross-database compatibility.
    On PostgreSQL, it uses the native ARRAY type.
    On SQLite (test mode), it serializes to a JSON string in a TEXT column.
    """
    impl = TEXT
    cache_ok = True

    def __init__(self, item_type, *args, **kwargs):
        self.item_type = item_type
        super().__init__(*args, **kwargs)

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(postgresql.ARRAY(self.item_type))
        else:
            return dialect.type_descriptor(TEXT())

    def process_bind_param(self, value, dialect):
        if dialect.name == "postgresql":
            return value
        if value is not None:
            return json.dumps(value)
        return None

    def process_result_value(self, value, dialect):
        if dialect.name == "postgresql":
            return value
        if value is not None:
            return json.loads(value)
        return []
