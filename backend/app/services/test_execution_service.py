"""
测试执行服务
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from ..models.test_management import TestExecution, TestTask, TestStrategy, TestScenario
from ..models.load_generator import LoadGenerator, LoadGeneratorConfig
from ..models.test_management import TestScript
from ..services.load_generator_service import LoadGeneratorService

logger = logging.getLogger(__name__)


class TestExecutionService:
    """测试执行服务"""
    
    def __init__(self, db: Session):
        self.db = db
        self.load_generator_service = LoadGeneratorService(db)
    
    async def start_execution(self, execution_id: int) -> Dict[str, Any]:
        """启动测试执行"""
        try:
            # 获取执行记录
            execution = self.db.query(TestExecution).filter(
                TestExecution.id == execution_id
            ).first()
            
            if not execution:
                return {"success": False, "message": "执行记录不存在"}
            
            if execution.status != "pending":
                return {"success": False, "message": f"执行状态不正确: {execution.status}"}
            
            # 获取关联数据
            task = self.db.query(TestTask).filter(TestTask.id == execution.task_id).first()
            strategy = self.db.query(TestStrategy).filter(TestStrategy.id == execution.strategy_id).first()
            load_generator = self.db.query(LoadGenerator).filter(LoadGenerator.id == execution.load_generator_id).first()
            load_generator_config = self.db.query(LoadGeneratorConfig).filter(
                LoadGeneratorConfig.id == execution.load_generator_config_id
            ).first()
            
            if not all([task, strategy, load_generator, load_generator_config]):
                return {"success": False, "message": "关联数据不完整"}
            
            # 检查压力机状态
            if load_generator.status != "online":
                return {"success": False, "message": "压力机不在线"}
            
            # 更新执行状态
            execution.status = "running"
            execution.started_at = datetime.utcnow()
            self.db.commit()
            
            # 异步执行压测
            asyncio.create_task(self._execute_load_test(execution_id))
            
            return {
                "success": True,
                "message": "测试执行已启动",
                "execution_id": execution_id
            }
            
        except Exception as e:
            logger.error(f"启动测试执行失败: {str(e)}")
            return {"success": False, "message": f"启动失败: {str(e)}"}
    
    async def stop_execution(self, execution_id: int, reason: str = "手动停止") -> Dict[str, Any]:
        """停止测试执行"""
        try:
            execution = self.db.query(TestExecution).filter(
                TestExecution.id == execution_id
            ).first()
            
            if not execution:
                return {"success": False, "message": "执行记录不存在"}
            
            if execution.status not in ["running", "pending"]:
                return {"success": False, "message": f"无法停止状态为 {execution.status} 的执行"}
            
            # 更新执行状态
            execution.status = "cancelled"
            execution.completed_at = datetime.utcnow()
            execution.error_message = reason
            
            if execution.started_at:
                execution.duration = int((execution.completed_at - execution.started_at).total_seconds())
            
            self.db.commit()
            
            # TODO: 这里应该停止实际的压测进程
            
            return {
                "success": True,
                "message": "测试执行已停止",
                "execution_id": execution_id
            }
            
        except Exception as e:
            logger.error(f"停止测试执行失败: {str(e)}")
            return {"success": False, "message": f"停止失败: {str(e)}"}
    
    async def _execute_load_test(self, execution_id: int):
        """执行压测任务"""
        try:
            execution = self.db.query(TestExecution).filter(
                TestExecution.id == execution_id
            ).first()
            
            if not execution:
                logger.error(f"执行记录不存在: {execution_id}")
                return
            
            # 获取关联数据
            task = self.db.query(TestTask).filter(TestTask.id == execution.task_id).first()
            strategy = self.db.query(TestStrategy).filter(TestStrategy.id == execution.strategy_id).first()
            load_generator = self.db.query(LoadGenerator).filter(LoadGenerator.id == execution.load_generator_id).first()
            load_generator_config = self.db.query(LoadGeneratorConfig).filter(
                LoadGeneratorConfig.id == execution.load_generator_config_id
            ).first()
            
            # 生成Locust脚本
            locust_script = await self._generate_locust_script(task, strategy)
            
            # 上传脚本到压力机
            script_path = await self._upload_script_to_load_generator(
                load_generator, locust_script, execution_id
            )
            
            # 启动Locust压测
            await self._start_locust_test(
                load_generator, load_generator_config, strategy, script_path, execution_id
            )
            
            # 监控压测进度
            await self._monitor_test_progress(execution_id, strategy.run_time)
            
            # 收集结果
            await self._collect_test_results(execution_id)
            
            # 更新执行状态为完成
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()
            execution.duration = int((execution.completed_at - execution.started_at).total_seconds())
            self.db.commit()
            
            logger.info(f"测试执行完成: {execution_id}")
            
        except Exception as e:
            logger.error(f"执行压测失败: {str(e)}")
            # 更新执行状态为失败
            execution = self.db.query(TestExecution).filter(
                TestExecution.id == execution_id
            ).first()
            if execution:
                execution.status = "failed"
                execution.completed_at = datetime.utcnow()
                execution.error_message = str(e)
                if execution.started_at:
                    execution.duration = int((execution.completed_at - execution.started_at).total_seconds())
                self.db.commit()
    
    async def _generate_locust_script(self, task: TestTask, strategy: TestStrategy) -> str:
        """生成Locust脚本"""
        try:
            # 获取测试脚本
            script_content = ""
            if task.script_id:
                script = self.db.query(TestScript).filter(TestScript.id == task.script_id).first()
                if script:
                    script_content = script.script_content
            
            # 如果没有脚本，生成基础脚本
            if not script_content:
                script_content = self._generate_basic_locust_script(task, strategy)
            
            return script_content
            
        except Exception as e:
            logger.error(f"生成Locust脚本失败: {str(e)}")
            return self._generate_basic_locust_script(task, strategy)
    
    def _generate_basic_locust_script(self, task: TestTask, strategy: TestStrategy) -> str:
        """生成基础Locust脚本"""
        # 获取场景详情
        scenarios = self.db.query(TestScenario).filter(
            TestScenario.task_id == task.id
        ).order_by(TestScenario.order).all()
        
        if not scenarios:
            # 单接口场景，使用基础脚本
            return f"""
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 2)
    host = "{task.target_host}"
    
    @task(1)
    def test_endpoint(self):
        self.client.get("/")
"""
        else:
            # 多接口场景，生成多接口脚本
            tasks_code = ""
            for scenario in scenarios:
                if scenario.method.upper() == "GET":
                    tasks_code += f"""
    @task({scenario.weight})
    def {scenario.interface_name.lower().replace(' ', '_')}(self):
        self.client.get("{scenario.interface_url}")
"""
                elif scenario.method.upper() == "POST":
                    body = scenario.body or "{}"
                    tasks_code += f"""
    @task({scenario.weight})
    def {scenario.interface_name.lower().replace(' ', '_')}(self):
        self.client.post("{scenario.interface_url}", json={body})
"""
            
            return f"""
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 2)
    host = "{task.target_host}"
{tasks_code}
"""
    
    async def _upload_script_to_load_generator(
        self, 
        load_generator: LoadGenerator, 
        script_content: str, 
        execution_id: int
    ) -> str:
        """上传脚本到压力机"""
        try:
            script_filename = f"locust_script_{execution_id}.py"
            script_path = f"/tmp/{script_filename}"
            
            # 使用SSH上传脚本
            ssh_client = self.load_generator_service._get_ssh_client(load_generator)
            sftp = ssh_client.open_sftp()
            
            # 创建临时文件
            with sftp.open(script_path, 'w') as f:
                f.write(script_content)
            
            sftp.close()
            ssh_client.close()
            
            logger.info(f"脚本已上传到压力机: {script_path}")
            return script_path
            
        except Exception as e:
            logger.error(f"上传脚本失败: {str(e)}")
            raise
    
    async def _start_locust_test(
        self,
        load_generator: LoadGenerator,
        load_generator_config: LoadGeneratorConfig,
        strategy: TestStrategy,
        script_path: str,
        execution_id: int
    ):
        """启动Locust压测"""
        try:
            # 构建Locust命令
            locust_cmd = f"""
locust -f {script_path} \
    --host={load_generator.host} \
    --users={strategy.user_count} \
    --spawn-rate={strategy.spawn_rate} \
    --run-time={strategy.run_time}s \
    --headless \
    --csv=/tmp/locust_results_{execution_id}
"""
            
            # 执行命令
            ssh_client = self.load_generator_service._get_ssh_client(load_generator)
            stdin, stdout, stderr = ssh_client.exec_command(locust_cmd)
            
            # 等待命令开始执行
            await asyncio.sleep(2)
            
            ssh_client.close()
            
            logger.info(f"Locust压测已启动: {execution_id}")
            
        except Exception as e:
            logger.error(f"启动Locust压测失败: {str(e)}")
            raise
    
    async def _monitor_test_progress(self, execution_id: int, run_time: int):
        """监控压测进度"""
        try:
            # 等待压测完成
            await asyncio.sleep(run_time)
            
            # 这里可以添加更复杂的监控逻辑
            # 比如定期检查压测状态、收集实时指标等
            
            logger.info(f"压测监控完成: {execution_id}")
            
        except Exception as e:
            logger.error(f"监控压测进度失败: {str(e)}")
            raise
    
    async def _collect_test_results(self, execution_id: int):
        """收集测试结果"""
        try:
            execution = self.db.query(TestExecution).filter(
                TestExecution.id == execution_id
            ).first()
            
            if not execution:
                return
            
            load_generator = self.db.query(LoadGenerator).filter(
                LoadGenerator.id == execution.load_generator_id
            ).first()
            
            # 从压力机下载结果文件
            ssh_client = self.load_generator_service._get_ssh_client(load_generator)
            sftp = ssh_client.open_sftp()
            
            # 下载CSV结果文件
            results_file = f"/tmp/locust_results_{execution_id}_stats.csv"
            local_results_file = f"/tmp/locust_results_{execution_id}_stats.csv"
            
            try:
                sftp.get(results_file, local_results_file)
                
                # 解析结果文件
                results = self._parse_locust_results(local_results_file)
                
                # 更新执行结果
                execution.total_requests = results.get('total_requests', 0)
                execution.total_failures = results.get('total_failures', 0)
                execution.avg_response_time = results.get('avg_response_time', 0.0)
                execution.max_response_time = results.get('max_response_time', 0.0)
                execution.min_response_time = results.get('min_response_time', 0.0)
                execution.requests_per_second = results.get('requests_per_second', 0.0)
                execution.error_rate = results.get('error_rate', 0.0)
                
                self.db.commit()
                
            except FileNotFoundError:
                logger.warning(f"结果文件不存在: {results_file}")
            
            sftp.close()
            ssh_client.close()
            
            logger.info(f"测试结果收集完成: {execution_id}")
            
        except Exception as e:
            logger.error(f"收集测试结果失败: {str(e)}")
            raise
    
    def _parse_locust_results(self, results_file: str) -> Dict[str, Any]:
        """解析Locust结果文件"""
        try:
            import csv
            
            results = {
                'total_requests': 0,
                'total_failures': 0,
                'avg_response_time': 0.0,
                'max_response_time': 0.0,
                'min_response_time': 0.0,
                'requests_per_second': 0.0,
                'error_rate': 0.0
            }
            
            with open(results_file, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get('Name') == 'Aggregated':
                        results['total_requests'] = int(row.get('Request Count', 0))
                        results['total_failures'] = int(row.get('Failure Count', 0))
                        results['avg_response_time'] = float(row.get('Average Response Time', 0.0))
                        results['max_response_time'] = float(row.get('Max Response Time', 0.0))
                        results['min_response_time'] = float(row.get('Min Response Time', 0.0))
                        results['requests_per_second'] = float(row.get('Requests/s', 0.0))
                        
                        if results['total_requests'] > 0:
                            results['error_rate'] = (results['total_failures'] / results['total_requests']) * 100
                        break
            
            return results
            
        except Exception as e:
            logger.error(f"解析Locust结果失败: {str(e)}")
            return {
                'total_requests': 0,
                'total_failures': 0,
                'avg_response_time': 0.0,
                'max_response_time': 0.0,
                'min_response_time': 0.0,
                'requests_per_second': 0.0,
                'error_rate': 0.0
            }


