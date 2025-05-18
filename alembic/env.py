from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# import os and sys to allow finding models.py
import os
import sys

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# --- CORRECTED METADATA SETUP ---
# Add the project's src/backend directory to the Python path
# This allows env.py to import your 'models.py' file.
# Assumes env.py is in 'alembic/' and models.py is in 'src/backend/' relative to project root.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
backend_src_path = os.path.join(project_root, 'src', 'backend')
sys.path.insert(0, backend_src_path)

from models import Base  # Import Base from your models.py
target_metadata = Base.metadata
# --- END CORRECTED METADATA SETUP ---

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Add render_as_batch here too for consistency if offline generation is ever used for SQLite
        render_as_batch=(url and url.startswith("sqlite:")) 
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}), # Pass default {}
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Determine if we are using SQLite for batch mode configuration
        render_as_batch_for_sqlite = connection.dialect.name == 'sqlite'
        
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            render_as_batch=render_as_batch_for_sqlite # Enable batch mode for SQLite
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()