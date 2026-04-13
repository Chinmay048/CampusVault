"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '../../store/auth';

// The main hero component
const AetherFlowHero = () => {
    const isAuthenticated = useAuthStore(s => !!s.accessToken);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId: number;
        let particles: Particle[] = [];
        const mouse = { x: null as number | null, y: null as number | null, radius: 200 };

        // eslint-disable-next-line react-hooks/unsupported-syntax
        class Particle {
            x: number;
            y: number;
            directionX: number;
            directionY: number;
            size: number;
            color: string;

            constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = this.color;
                ctx.fill();
            }

            update() {
                if (!canvas) return;
                if (this.x > canvas.width || this.x < 0) {
                    this.directionX = -this.directionX;
                }
                if (this.y > canvas.height || this.y < 0) {
                    this.directionY = -this.directionY;
                }

                // Mouse collision detection
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < mouse.radius + this.size) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const force = (mouse.radius - distance) / mouse.radius;
                        this.x -= forceDirectionX * force * 5;
                        this.y -= forceDirectionY * force * 5;
                    }
                }

                this.x += this.directionX;
                this.y += this.directionY;
                this.draw();
            }
        }

        function init() {
            if (!canvas) return;
            particles = [];
            const numberOfParticles = (canvas.height * canvas.width) / 9000;
            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 2) + 1;
                const x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
                const y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
                const directionX = (Math.random() * 0.4) - 0.2;
                const directionY = (Math.random() * 0.4) - 0.2;
                const color = 'rgba(191, 128, 255, 0.8)'; // Brighter purple
                particles.push(new Particle(x, y, directionX, directionY, size, color));
            }
        };

        const resizeCanvas = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init(); 
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        const connect = () => {
            if (!canvas || !ctx) return;
            let opacityValue = 1;
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const distance = ((particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
                        + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));
                    
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        opacityValue = 1 - (distance / 20000);
                        
                        const dx_mouse_a = mouse.x !== null ? particles[a].x - mouse.x : 0;
                        const dy_mouse_a = mouse.y !== null ? particles[a].y - mouse.y : 0;
                        const distance_mouse_a = Math.sqrt(dx_mouse_a*dx_mouse_a + dy_mouse_a*dy_mouse_a);

                        if (mouse.x !== null && distance_mouse_a < mouse.radius) {
                             ctx.strokeStyle = `rgba(255, 255, 255, ${opacityValue})`;
                        } else {
                             ctx.strokeStyle = `rgba(200, 150, 255, ${opacityValue})`;
                        }
                        
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            if (!ctx) return;
            animationFrameId = requestAnimationFrame(animate);
            // We use transparent or match the deep dark background
            ctx.clearRect(0, 0, innerWidth, innerHeight);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
            }
            connect();
        };
        
        const handleMouseMove = (event: MouseEvent) => {
            mouse.x = event.clientX;
            mouse.y = event.clientY;
        };
        
        const handleMouseOut = () => {
            mouse.x = null;
            mouse.y = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseOut);

        init();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseOut);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const fadeUpVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.2 + 0.5,
                duration: 0.8,
                ease: "easeInOut",
            },
        }),
    };

    return (
        <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-transparent">
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full opacity-70"></canvas>
            
            <div className="relative z-10 text-center p-6">
                <motion.div
                    custom={0}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6 backdrop-blur-sm"
                >
                    <Zap className="h-4 w-4 text-indigo-400" />
                    <span className="text-sm font-medium text-slate-200">
                        AI-Powered Placement OS
                    </span>
                </motion.div>

                <motion.h1
                    custom={1}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-5xl md:text-8xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-linear-to-b from-white to-slate-400"
                >
                    CampusVault
                </motion.h1>

                <motion.p
                    custom={2}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-2xl mx-auto text-lg text-slate-400 mb-10"
                >
                    Your intelligent operating system for cracking top tech companies. Connect your Github, ace AI assessments, and get placed.
                </motion.p>

                <motion.div
                    custom={3}
                    variants={fadeUpVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mx-auto w-fit"
                >
                    {isAuthenticated ? (
                        <>
                            <Link to="/dashboard" className="px-8 py-4 bg-indigo-500 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_rgba(99,102,241,0.8)] transition-all duration-300 flex items-center gap-2">
                                Go to Dashboard
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link to="/register" className="px-8 py-4 bg-indigo-500 text-white font-semibold rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_rgba(99,102,241,0.8)] transition-all duration-300 flex items-center gap-2">
                                Get Started Free
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                            <Link to="/login" className="px-8 py-4 bg-transparent border border-slate-600 text-slate-300 font-semibold rounded-lg hover:border-indigo-500 hover:text-white transition-all duration-300">
                                Sign In
                            </Link>
                        </>
                    )}
                    <Link to="/companies" className="px-8 py-4 bg-transparent border border-slate-600 text-slate-300 font-semibold rounded-lg hover:border-indigo-500 hover:text-white transition-all duration-300">
                        View Companies
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default AetherFlowHero;