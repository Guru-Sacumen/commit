"""Alembic environment configuration.

Configures Alembic for database migrations with environment variable support
and automatic model discovery for migration generation.
"""

from logging.config import fileConfig
import os
import sys
from dotenv import load_dotenv

from alembic import context
from sqlalchemy import engine_from_config, pool

from database import Base
from models import *  # Import all models

load_dotenv()

# Append current directory to Python path
sys.path.append(os.path.dirname(__file__))

# Alembic configuration
config = context.config

# Database URL configuration
db_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/connectx")
db_url = db_url.replace("%", "%%")  # Escape for Alembic
config.set_main_option("sqlalchemy.url", db_url)

# Logging configuration
if config.config_file_name is not None:
    try:
        fileConfig(config.config_file_name)
    except KeyError:
        import logging
        logging.basicConfig(level=logging.INFO)

# Target metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in offline mode.
    
    Configures context with URL only, no Engine required.
    
    Returns:
        None
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in online mode.
    
    Creates Engine and connection for database migrations.
    
    Returns:
        None
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
