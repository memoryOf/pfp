"""Fix test_executions table structure

Revision ID: 003
Revises: 002
Create Date: 2024-01-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # 检查表是否存在，如果不存在则创建
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'test_executions' not in tables:
        # 如果表不存在，创建新表
        op.create_table('test_executions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('task_id', sa.Integer(), nullable=False),
            sa.Column('strategy_id', sa.Integer(), nullable=False),
            sa.Column('load_generator_id', sa.Integer(), nullable=False),
            sa.Column('load_generator_config_id', sa.Integer(), nullable=False),
            sa.Column('execution_name', sa.String(length=200), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
            sa.Column('total_requests', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('total_failures', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('avg_response_time', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('max_response_time', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('min_response_time', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('requests_per_second', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('error_rate', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('started_at', sa.DateTime(), nullable=True),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.Column('duration', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['task_id'], ['test_tasks.id'], ),
            sa.ForeignKeyConstraint(['strategy_id'], ['test_strategies.id'], ),
            sa.ForeignKeyConstraint(['load_generator_id'], ['load_generators.id'], ),
            sa.ForeignKeyConstraint(['load_generator_config_id'], ['load_generator_configs.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        return
    
    # 如果表存在，检查并添加缺失的列
    columns = [col['name'] for col in inspector.get_columns('test_executions')]
    
    # 添加 strategy_id 列
    if 'strategy_id' not in columns:
        op.add_column('test_executions', sa.Column('strategy_id', sa.Integer(), nullable=True))
        # 如果有数据，需要先设置默认值
        op.execute("UPDATE test_executions SET strategy_id = 1 WHERE strategy_id IS NULL")
        op.alter_column('test_executions', 'strategy_id', nullable=False)
        op.create_foreign_key('fk_test_executions_strategy_id', 'test_executions', 'test_strategies', ['strategy_id'], ['id'])
    
    # 重命名 config_id 为 load_generator_config_id
    if 'config_id' in columns and 'load_generator_config_id' not in columns:
        op.alter_column('test_executions', 'config_id', new_column_name='load_generator_config_id')
    
    # 重命名 start_time 为 started_at
    if 'start_time' in columns and 'started_at' not in columns:
        op.alter_column('test_executions', 'start_time', new_column_name='started_at')
    
    # 重命名 end_time 为 completed_at
    if 'end_time' in columns and 'completed_at' not in columns:
        op.alter_column('test_executions', 'end_time', new_column_name='completed_at')
    
    # 删除不需要的列（如果存在）
    if 'result_id' in columns:
        # 先删除外键约束
        try:
            op.drop_constraint('test_executions_ibfk_2', 'test_executions', type_='foreignkey')
        except:
            pass
        op.drop_column('test_executions', 'result_id')
    
    # 添加缺失的列
    if 'execution_name' not in columns:
        op.add_column('test_executions', sa.Column('execution_name', sa.String(length=200), nullable=True))
    
    if 'total_requests' not in columns:
        op.add_column('test_executions', sa.Column('total_requests', sa.Integer(), nullable=True, server_default='0'))
    
    if 'total_failures' not in columns:
        op.add_column('test_executions', sa.Column('total_failures', sa.Integer(), nullable=True, server_default='0'))
    
    if 'avg_response_time' not in columns:
        op.add_column('test_executions', sa.Column('avg_response_time', sa.Float(), nullable=True, server_default='0.0'))
    
    if 'max_response_time' not in columns:
        op.add_column('test_executions', sa.Column('max_response_time', sa.Float(), nullable=True, server_default='0.0'))
    
    if 'min_response_time' not in columns:
        op.add_column('test_executions', sa.Column('min_response_time', sa.Float(), nullable=True, server_default='0.0'))
    
    if 'requests_per_second' not in columns:
        op.add_column('test_executions', sa.Column('requests_per_second', sa.Float(), nullable=True, server_default='0.0'))
    
    if 'error_message' not in columns:
        op.add_column('test_executions', sa.Column('error_message', sa.Text(), nullable=True))
    
    if 'error_rate' not in columns:
        op.add_column('test_executions', sa.Column('error_rate', sa.Float(), nullable=True, server_default='0.0'))
    
    if 'duration' not in columns:
        op.add_column('test_executions', sa.Column('duration', sa.Integer(), nullable=True))


def downgrade():
    # 回滚操作（如果需要）
    pass

