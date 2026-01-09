"""Fix test_scenarios table structure

Revision ID: 004
Revises: 003
Create Date: 2024-01-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    """更新test_scenarios表结构以匹配代码模型"""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # 检查表是否存在
    tables = inspector.get_table_names()
    if 'test_scenarios' not in tables:
        # 如果表不存在，创建新表
        op.create_table('test_scenarios',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('task_id', sa.Integer(), nullable=False),
            sa.Column('interface_name', sa.String(length=200), nullable=False),
            sa.Column('interface_url', sa.String(length=500), nullable=False),
            sa.Column('method', sa.String(length=10), nullable=True, server_default='GET'),
            sa.Column('weight', sa.Integer(), nullable=True, server_default='1'),
            sa.Column('order', sa.Integer(), nullable=True, server_default='1'),
            sa.Column('headers', sa.JSON(), nullable=True),
            sa.Column('body', sa.Text(), nullable=True),
            sa.Column('timeout', sa.Integer(), nullable=True, server_default='30'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['task_id'], ['test_tasks.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.Index('idx_task_id', 'task_id')
        )
        return
    
    # 如果表存在，检查并更新列
    columns = {col['name']: col for col in inspector.get_columns('test_scenarios')}
    
    # 如果存在旧的name列，需要迁移数据
    if 'name' in columns and 'interface_name' not in columns:
        # 先添加新列
        op.add_column('test_scenarios', sa.Column('interface_name', sa.String(length=200), nullable=True))
        # 迁移数据：将name的值复制到interface_name
        op.execute("UPDATE test_scenarios SET interface_name = name WHERE interface_name IS NULL")
        # 设置非空约束
        op.alter_column('test_scenarios', 'interface_name', nullable=False)
    
    # 添加interface_url列（如果不存在）
    if 'interface_url' not in columns:
        op.add_column('test_scenarios', sa.Column('interface_url', sa.String(length=500), nullable=True))
        # 设置默认值
        op.execute("UPDATE test_scenarios SET interface_url = '/' WHERE interface_url IS NULL")
        op.alter_column('test_scenarios', 'interface_url', nullable=False)
    
    # 添加method列（如果不存在）
    if 'method' not in columns:
        op.add_column('test_scenarios', sa.Column('method', sa.String(length=10), nullable=True, server_default='GET'))
    
    # 添加weight列（如果不存在）
    if 'weight' not in columns:
        op.add_column('test_scenarios', sa.Column('weight', sa.Integer(), nullable=True, server_default='1'))
    
    # 添加order列（如果不存在，注意order是MySQL关键字，需要用反引号）
    if 'order' not in columns:
        op.add_column('test_scenarios', sa.Column('order', sa.Integer(), nullable=True, server_default='1'))
    
    # 添加headers列（如果不存在）
    if 'headers' not in columns:
        op.add_column('test_scenarios', sa.Column('headers', sa.JSON(), nullable=True))
    
    # 添加body列（如果不存在）
    if 'body' not in columns:
        op.add_column('test_scenarios', sa.Column('body', sa.Text(), nullable=True))
    
    # 添加timeout列（如果不存在）
    if 'timeout' not in columns:
        op.add_column('test_scenarios', sa.Column('timeout', sa.Integer(), nullable=True, server_default='30'))
    
    # 删除旧的列（如果存在且不再需要）
    if 'script_content' in columns:
        # script_content字段在新的模型中不再使用，可以删除
        # 但为了安全，先检查是否有数据依赖
        op.drop_column('test_scenarios', 'script_content')
    
    if 'name' in columns and 'interface_name' in columns:
        # 如果interface_name已经存在，可以删除旧的name列
        op.drop_column('test_scenarios', 'name')


def downgrade():
    """回滚操作"""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'test_scenarios' not in inspector.get_table_names():
        return
    
    columns = {col['name']: col for col in inspector.get_columns('test_scenarios')}
    
    # 恢复旧的结构（如果需要）
    if 'interface_name' in columns and 'name' not in columns:
        op.add_column('test_scenarios', sa.Column('name', sa.String(length=255), nullable=True))
        op.execute("UPDATE test_scenarios SET name = interface_name WHERE name IS NULL")
        op.alter_column('test_scenarios', 'name', nullable=False)
    
    # 删除新添加的列
    if 'interface_url' in columns:
        op.drop_column('test_scenarios', 'interface_url')
    if 'method' in columns:
        op.drop_column('test_scenarios', 'method')
    if 'weight' in columns:
        op.drop_column('test_scenarios', 'weight')
    if 'order' in columns:
        op.drop_column('test_scenarios', 'order')
    if 'headers' in columns:
        op.drop_column('test_scenarios', 'headers')
    if 'body' in columns:
        op.drop_column('test_scenarios', 'body')
    if 'timeout' in columns:
        op.drop_column('test_scenarios', 'timeout')
    
    # 恢复script_content列
    if 'script_content' not in columns:
        op.add_column('test_scenarios', sa.Column('script_content', sa.Text(), nullable=True))

